# Digital Credentials Consortium workflow-coordinator

[![Build status](https://img.shields.io/github/actions/workflow/status/digitalcredentials/workflow-coordinator/main.yml?branch=main)](https://github.com/digitalcredentials/workflow-coordinator/actions?query=workflow%3A%22Node.js+CI%22)

An Express server that coordinates micro-services within a Docker Compose Network to issue [Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) to a wallet like the [Learner Credential Wallet (LCW)](https://lcw.app) using the [exchange protocol of the VC-API spec](https://w3c-ccg.github.io/vc-api/#initiate-exchange) and either the [Credential Handler API (CHAPI)](https://chapi.io) or the custom DCC deep link protocol to select a wallet.

This is meant to be used within a larger institutional system that already handles authentication and storage/retrieval of the user data (needed for the credential), and so simply passes that data to this system after authentication, at which point this system then largely handles the exchange with the wallet.

NOTE: because this coordinator interacts with a wallet through the [exchange protocol of the VC-API spec](https://w3c-ccg.github.io/vc-api/#initiate-exchange), the coordinator has to be callable from the wallet, and for wallets that run on a phone, this can be tricky when trying this out locally. If you are new to this, you may want to first start by experimenting with the [DCC Issuer Coordinator](https://github.com/digitalcredentials/issuer-coordinator) which issues credentials that can then be independently imported into a wallet.

We have also made available a public demonstration of the exchange, which you can try by opening this [link](https://issuer.dcconsortium.org/demo) from a web browser on the same phone on which you've installed the [Learner Credential Wallet (LCW)](https://lcw.app)

## Table of Contents

- [Summary](#summary)
- [Architecture](#architecture)
- [Wallet Exchange](#wallet-exchange)
- [API](#api)
- [Quick Start](#quick-start)
  - [Install Docker](#install-docker)
  - [Create Docker Compose File](#create-docker-compose-file)
  - [Run Service](#run-service)
  - [Issue Credentials](#issue-credentials)
- [Versioning](#versioning)
- [Configuration](#configuration)
  - [Generate New Key](#generate-new-key)
  - [Tenants](#tenants)
  - [Signing Key](#signing-key)
  - [DID Registries](#did-registries)
  - [did:key](#did-key)
  - [did:web](#did-web)
  - [Protecting Tenant Endpoints](#protecting-tenant-endpoints)
  - [Revocation and Suspension](#revocation-and-suspension)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Integration](#integration)
  - [Issuing](#issuing)
  - [Revoking and Suspending](#revoking-and-suspending)
- [Development](#development)
  - [Testing](#testing)
- [Contribute](#contribute)
- [License](#license)

## Summary

Use this server to issue [Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) to a wallet like the [Learner Credential Wallet (LCW)](https://lcw.app). Credentials can optionally be allocated a [revocation status](https://www.w3.org/TR/vc-status-list/) that can later be used to revoke the credential.

The issued credentials are _assigned_ to a [Decentralized Identifier (DID)](https://www.w3.org/TR/did-core/) that the wallet provides (on behalf of the holder) to the issuer as part of the exchange. DIDs are effectively collections of cryptographic key pairs, which in this case later allow the holder to demonstrate that they control the credential by signing challenges using a private key associated with their DID.

## Architecture

This is an express app intended to run as a service within a Docker Compose network. This app coordinates calls to other express apps running as services within the same Docker Compose network, in particular:

* [DCC transaction-service](https://github.com/digitalcredentials/transaction-service)
* [DCC signing-service](https://github.com/digitalcredentials/signing-service)

and optionally also:

* DCC [database credential status service](https://github.com/digitalcredentials/status-service-db) or [Git credential status service](https://github.com/digitalcredentials/status-service-git)
* [DCC template service](https://github.com/digitalcredentials/template-service) (IN PROGRESS)

Note that all the calls to the internal services are only available within the Docker Compose network, and are not exposed externally.

Typical use would be to run this in combination with something like `nginx-proxy` and `acme-companion` (for the automated creation, renewal and use of SSL certificates) using `docker-compose`. You may also run your own apps within the same Docker Compose network. You might, for example, run a react app with a user interface from which the student can request the credential. [Usage - Integration](#integration) further discusses how to incorporate this system into your own institutional system.

## Wallet Exchange

This issuer implements the [VC-API Exchange protocol](https://w3c-ccg.github.io/vc-api/) which in this case is essentially:

1. Wallet (controlled by the recipient/holder, e.g., a student) tells the issuer that it wants to start a specific exchange (in this case to get a specific credential, like a diploma)
2. Issuer replies, saying that the wallet must first provide a [Decentralized Identifier (DID)](https://www.w3.org/TR/did-core/) that belongs to the holder (i.e, the student), along with signed proof that the DID does in fact belong to the holder
3. Wallet sends back the DID and proof (in a DIDAuth Verifiable Presentation)
4. Issuer verifies the proof and replies with the requested credential, issued to the supplied DID

NOTE: Issuing the credential to the holder's DID later allows the holder to prove that they _control_ the credential by using their DID to sign challenges from verifiers.

NOTE: we also provide an option to skip the first two steps so that the wallet can immediately post the DIDAuth after the deep link opens it. This provides backwards compatability with wallets that implemented this simpler flow (for example as part of JFF PlugFest 2).

NOTE: We further provide a convenience endpoint that is not part of the VC-API spec and that effectively allows the institution to delegate most handling to a workflow coordinator by giving the workflow coordinator everything it needs to manage the exchange without further help from the institution. This is not part of the VC-API spec and is only meant to make implementation easier for the institution. This endpoint is called by institutional software at the point after the student has been authenticated by the institutianl authentication system and the data for the credential has been retrieved from the institutional data store.

The flow looks like:

TODO: ADD DIAGRAM

## API

This system implements four public endpoints:

Three implement from the [VC-API](https://w3c-ccg.github.io/vc-api/) spec:

 * [POST /exchange/{exchangeID}](https://w3c-ccg.github.io/vc-api/#initiate-exchange)
 * [POST /exchange/{exchangeID}/{transactionID}](https://w3c-ccg.github.io/vc-api/#continue-exchange)
 * [POST /credentials/status](https://w3c-ccg.github.io/vc-api/#update-status)

...and a fourth convenience endpoint that handles most of the exchange on behalf of the institution:

 * `POST /exchange/setup`

With this endpoint the institution posts a list of the unsigned verifiable credentials for which it wants deep links or a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) that can be used with the [Credential Handler API (CHAPI)](https://chapi.io). The posted object should have the following structure:

```js
{
  "tenantName": "someTenantName",
  "data": [
    {"vc": {/*someVCGoesHere*/}, "retrievalId": "anIdWithWhichToIdentifyThisVCInTheResult"},
    {"vc": {/*anotherVCGoesHere*/}, "retrievalId": "aDifferentRetrievalId"}
  ]
}
```

If the tenant is protected with a token, then the token must be submitted in the authorization header as a bearer token. See the [Tenants](#add-tenants) section.

For example, this is the data you'd post for a single credential to an unprotected tenant:

```json
{
  "tenantName": "UN_PROTECTED_TEST",
  "data": [
    {
      "retrievalId": "anyIdThatIsMeaningfulForYou",
      "vc": {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.2.json"
        ],
        "id": "urn:uuid:2fe53dc9-b2ec-4939-9b2c-0d00f6663b6c",
        "type": [
          "VerifiableCredential",
          "OpenBadgeCredential"
        ],
        "name": "DCC Test Credential",
        "issuer": {
          "type": ["Profile"],
          "id": "did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC",
          "name": "Digital Credentials Consortium Test Issuer",
          "url": "https://dcconsortium.org",
          "image": "https://user-images.githubusercontent.com/752326/230469660-8f80d264-eccf-4edd-8e50-ea634d407778.png"
        },
        "issuanceDate": "2023-08-02T17:43:32.903Z",
        "credentialSubject": {
          "type": ["AchievementSubject"],
          "achievement": {
            "id": "urn:uuid:bd6d9316-f7ae-4073-a1e5-2f7f5bd22922",
            "type": ["Achievement"],
            "achievementType": "Diploma",
            "name": "Badge",
            "description": "This is a sample credential issued by the Digital Credentials Consortium to demonstrate the functionality of Verifiable Credentials for wallets and verifiers.",
            "criteria": {
              "type": "Criteria",
              "narrative": "This credential was issued to a student that demonstrated proficiency in the Python programming language that occurred from **February 17, 2023** to **June 12, 2023**."
            },
            "image": {
              "id": "https://user-images.githubusercontent.com/752326/214947713-15826a3a-b5ac-4fba-8d4a-884b60cb7157.png",
              "type": "Image"
            }
          },
          "name": "Jane Doe"
        }
      }
    }
  ]
}
```

The endpoint returns a JSON object that provides three options for selecting a wallet:

 * [a _direct_ custom DCC deep link](#deeplink)
 * [a _vpr_ custom DCC deep link](#deeplink)
 * a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) 

An example of the returned object:

```json
[{
	"retrievalId": "someId",
	"directDeepLink": "https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=9374011d-2b48-4416-a7a8-ea7a50b155a8&vc_request_url=http://localhost:4005/exchange/8c6f8343-e82b-48a2-b81e-3c9e0d596238/9374011d-2b48-4416-a7a8-ea7a50b155a8",
	"vprDeepLink": "https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&vc_request_url=http://localhost:4005/exchange/8c6f8343-e82b-48a2-b81e-3c9e0d596238",
	"chapiVPR": {
		"query": {
			"type": "DIDAuthentication"
		},
		"interact": {
			"service": [{
				"type": "VerifiableCredentialApiExchangeService",
				"serviceEndpoint": "http://localhost:4005/exchange/8c6f8343-e82b-48a2-b81e-3c9e0d596238/9374011d-2b48-4416-a7a8-ea7a50b155a8"
			}, {
				"type": "CredentialHandlerService"
			}]
		},
		"challenge": "9374011d-2b48-4416-a7a8-ea7a50b155a8",
		"domain": "http://localhost:4005"
	}
}]
```

The **retrievalId** is used to identify the result for each credential when more than one credential has been posted in the same post. The issuer supplies these IDs when posting the data. The `retrievalId` can be anything that makes sense for the issuer.

The **directDeepLink** will open the [Learner Credential Wallet](https://lcw.app) after which the wallet invokes the **vc_request_url** that is passed as a query parameter on the deep link, and gets the signed VC back immediately.

The **vprDeepLink** will open the [Learner Credential Wallet](https://lcw.app) after which the wallet similarly invokes the **vc_request_url** but in this case the result of that call is a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) request for a DIDAuth. So this is a two-step exchange whereas the `directDeepLink` is a one-step exchange.

The **chapiVPR** is a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) that is meant to be used with a [Credential Handler API (CHAPI)](https://chapi.io) _get_ call to pass the [VPR](https://w3c-ccg.github.io/vp-request-spec/) into a wallet which will then make a call to the exchange endpoint to get back the signed verifiable credential.

The institutional software then offers the student the appropriate option. For an example of how this would work look at the `GET /demo` endpoint which demonstrates with a working example how an institution would use the `workflow-coordinator`.

## Quick Start

We've tried hard to make this as simple as possible to install and maintain, but also easy to evaluate and understand as you consider whether digital credentials are useful for your project, and whether this issuer would work for you.

Installing and running the issuer is straightforward and should take less than five minutes in total. The trickier part is exposing your coordinator so that a wallet can make calls to your coordinator. We describe some approaches further below.

### Install Docker

Docker have made this very easy, with [installers for Windows, Mac, and Linux](https://docs.docker.com/engine/install/) that make it as easy to install as any other application.

### Create Docker Compose File

Create a file called `docker-compose.yml` and add the following:

```yaml
version: '3.5'
services:
  coordinator:
    image: digitalcredentials/workflow-coordinator:1.0.0
    ports:
      - "4005:4005"
  signing:
    image: digitalcredentials/signing-service:1.0.0
  transaction:
    image: digitalcredentials/transaction-service:0.2.0
  status:
    image: digitalcredentials/status-service-db:0.1.0
  # NOTE: If you would prefer to use the Git based status manager instead
  # of the database status manager, uncomment this section and comment
  # out the previous section
  # status:
  #   image: digitalcredentials/status-service-git:0.1.0
```

Note that as of this writing (October 11 2024), the versions of each image are as listed above. These will change over time. Read more in [Versioning](#versioning).

### Run Service

From the terminal in the same directory that contains your docker-compose.yml file:

```docker compose up```

### Issue Credentials

This is a bit tricky because the credentials are issued to a wallet like the [Learner Credential Wallet (LCW)](https://lcw.app) and so your wallet needs to make a call to your locally running issuer, which normally runs on localhost, and which your phone doesn't usually by default have access to. You have at least two choices here:

1. Run the wallet locally on your computer within a phone emulator. One way to do that with the [Learner Credential Wallet (LCW)](https://lcw.app) is described [here](https://github.com/digitalcredentials/learner-credential-wallet#development-setup).

Then you can issue a test credential by opening this url in the web browser of your phone emulator :

[http://localhost:4005/demo](http://localhost:4005/demo)

This should trigger the opening of the LCW app on your phone, with a prompt to download a credential.

2. Issue directly to the [Learner Credential Wallet (LCW)](https://lcw.app) running on your physical phone by connecting your phone to your computer. You can do that by following these [instructions](https://dev.to/shaundai/using-localhost-for-mobile-development-1k4g) which tells you how to find the IP on which your laptop is running in your local network, and then open the following URL from a web browser on your laptop (replacing YOUR_IP with the IP you just determined):

`http://YOUR_IP:4005/demo`

This should trigger the opening of the LCW app on your phone, with a prompt to download a credential.

NEXT STEP: you'll soon want to issue your own credential, signed with your own keys. Continue on to [Setup](#setup) to find out how to do configure the Docker Compose network to do just that.

NOTE: Revocation is not enabled in the Quick Start. You've got to setup a couple of things to [ENABLE REVOCATION](#create-github-repositories), but you'll probably first want to configure the other parts of the application, make sure they work, and then enanble revocation. So let's get setup...

## Versioning

The `workflow-coordinator` and the services it coordinates are all intended to run as docker images within a docker compose network. For convenience we've published those images to Docker Hub so that you don't have to build them locally yourself from the github repositories.

The images on Docker Hub will of course be updated to add new functionality and fix bugs. Rather than overwrite the default (`latest`) version on Docker Hub for each update, we've adopted the [Semantic Versioning Guidelines](https://semver.org) with our docker image tags.

We DO NOT provide a `latest` tag so you must provide a tag name (i.e, the version number) for the images in your docker compose file, as we've done [here](./docker-compose.yml).

To ensure you've got compatible versions of the services and the coordinator, the `major` number for each should match. At the time of writing, the versions for each are at 0.1.0, and the `major` number (the leftmost number) agrees across all three.

If you do ever want to work from the source code in the repository and build your own images, we've tagged the commits in Github that were used to build the corresponding Docker image. So a github tag of v0.1.0 coresponds to a docker image tag of 0.1.0

## Configuration 

There are a few things you'll want to configure. These include, but may not be limited to:
* Your signing keys, which enable only you to sign your credentials
* Revocation/suspension support
* "Multi-tenant" signing, which enables you to use different keys for different credentialing purposes (e.g., signing credentials for different courses)

The app is configured with three `.env` files (Note that you only need to configure one of the `.status-service-*.env` files, depending on if you are using the database status manager or the Git status manager):

* [.coordinator.env](.coordinator.env)
* [.signing-service.env](.signing-service.env)
* [.status-service-db.env](.status-service-db.env) OR [.status-service-git.env](.status-service-git.env)

If you've used the Quick Start `docker-compose.yml`, then you'll have to change it a bit to point at these files. Alternatively, we've pre-configured this [docker-compose.yml](docker-compose.yml), though, so you can just use that.

The issuer is pre-configured with a default signing key for testing that can only be used for testing and evaluation. Any credentials signed with this key are meaningless because anyone else can use it to sign credentials, and so could create fake copies of your credentials which would appear to be properly signed. There would be no way to know that it was fake. So, you'll want to add our own key which you do by generating a new key and setting it for a new tenant name.

#### Generate New Key

To issue your own credentials, you must generate your own signing key and keep it private. At the moment, the issuer supports two [DID](https://www.w3.org/TR/did-core/) key formats/protocols: `did:key` and `did:web`.

The `did:key` DID is one of the simpler DID implementations and doesn't require that the DID document be hosted anywhere. However, many organizations are likely to prefer the `did:web` DID for production deployments. This DID format and protocol allows the owner to rotate (change) their signing key without having to update every credential that is signed by the old keys.

We've tried to simplify key generation by providing convenience endpoints in the issuer that you can use to generate a brand new key. You can generate a DID key with these cURL commands (in a terminal):

- `did:key`:
  ```bash
  curl --location 'http://localhost:4005/did-key-generator'
  ```
- `did:web`:
  ```bash
  curl \
    --location 'localhost:4006/did-web-generator' \
    --header 'Content-Type: application/json' \
    --data-raw '{
      "url": "https://raw.githubusercontent.com/user-or-org/did-web-test/main"
    }'
  ```

These commands will return a JSON document that contains the following data:

- a secret seed
- the corresponding DID
- the corresponding DID document

Here is an example output for `did:key`:

```json
{
  "seed": "z1AjQUBZCNoiyPUC8zbbF29gLdZtHRqT6yPdFGtqJa5VfQ6",
  "did": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4",
  "didDocument": {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://w3id.org/security/suites/x25519-2020/v1"
    ],
    "id": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4",
    "verificationMethod": [{
      "id": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4#z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4",
      "publicKeyMultibase": "z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4"
    }],
    "authentication": ["did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4#z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4"],
    "assertionMethod": ["did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4#z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4"],
    "capabilityDelegation": ["did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4#z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4"],
    "capabilityInvocation": ["did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4#z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4"],
    "keyAgreement": [{
      "id": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4#z6LSnYW9e4Q4EXTvdjDhKyr2D1ghBfSLa5dJGBfzjG6hyPEt",
      "type": "X25519KeyAgreementKey2020",
      "controller": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4",
      "publicKeyMultibase": "z6LSnYW9e4Q4EXTvdjDhKyr2D1ghBfSLa5dJGBfzjG6hyPEt"
    }]
  }
}
```

...and here is an example output for `did:web` \*:

```json
{
  "seed": "z1AcNXDnko1P6QMiZ3bxsraNvVtRbpXKeE8GNLDXjBJ5UHz",
  "decodedSeed": "DecodedUint8ArraySeed",
  "did": "did:web:raw.githubusercontent.com:user-or-org:did-web-test:main",
  "didDocument": {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://w3id.org/security/suites/x25519-2020/v1"
    ],
    "id": "did:web:raw.githubusercontent.com:user-or-org:did-web-test:main",
    "assertionMethod": [
      {
        "id": "did:web:raw.githubusercontent.com:user-or-org:did-web-test:main#z6MkfGZKFTyxiH9HgFUHbPQigEWh8PtFaRkESt9oQLiTvhVq",
        "type": "Ed25519VerificationKey2020",
        "controller": "did:web:raw.githubusercontent.com:user-or-org:did-web-test:main",
        "publicKeyMultibase": "z6MkfGZKFTyxiH9HgFUHbPQigEWh8PtFaRkESt9oQLiTvhVq"
      }
    ]
  }
}
```

**\* Note:** For the `did:web` key, the value of `didDocument` needs to be hosted at `${DID_WEB_URL}/.well-known/did.json`, where `DID_WEB_URL` is the issuer controlled URL that was passed as the `url` field of the request body in the `did:web` cURL command above. In the example above, this URL is https://raw.githubusercontent.com/user-or-org/did-web-test/main, because we are using GitHub to host a DID document in a repo named `did-web-test`, owned by user/org `user-or-org`, at the path `/.well-known/did.json`. In a production deployment, this might be something like https://registrar.example.edu.

Now that you've got your key, you'll want to enable it by adding a new tenant to use the seed.

#### Set Signing Key

Signing keys are set as 'seeds' in the [.signing-service.env](.signing-service.env) file for the `signing-service`.

The default signing key is set as:

`TENANT_SEED_DEFAULT=generate`

The 'generate' value means that a new random seed is generated everytime the app starts. The seed only exists for the life of the process. This is fine for experimentation, but to issue credentials whose issuer can be verified you need a permanent key that you can add to a trusted registry. The registry certifies that the key really does belong to the claimed issuer. A verifier checks the registry when verifying a credential.

So, take the value of the 'seed' property for the key you generated, which from the example above would be:

`"seed": "z1AjQUBZCNoiyPUC8zbbF29gLdZtHRqT6yPdFGtqJa5VfQ6"`

and replace the 'generate' value for the TENANT_SEED_DEFAULT with your new seed value, like so:

`TENANT_SEED_DEFAULT=z1AjQUBZCNoiyPUC8zbbF29gLdZtHRqT6yPdFGtqJa5VfQ6`

Once your key is set, you can test it as described in [Usage](usage).

Note that this sets a key for the default tenant, but you can set up as many tenants as you like as explained in the [Add Tenants](#add-tenants) section. 

### Add Tenants

You might want to allow more than one signing key/DID to be used with the issuer. For example, you might want to sign university/college degree diplomas with a DID that is only used by the registrar, but also allow certificates for individual courses to be signed by by different DIDS that are owned by the faculty or department or even the instructors that teach the courses.

We're calling these differents signing authorities 'tenants'.  

#### Add a Tenant Seed

Adding a tenant is simple. Just add another `TENANT_SEED_{TENANT_NAME}` environment variable in [.signing-service.env](.signing-service.env). The value of the variable should be a seed. Generate a new seed as explained in [Generate New Key](#generate-new-key), and set it as explained for the default tenant in [Set Signing Key](#set-signing-key).

#### Declare Tenant Endpoints

Tenant endpoints must be add to [.coordinator.env](.coordinator.env) and given a value of either 'UNPROTECTED' or some arbitrary value of your choosing (like a UUID). If you set a value other than UNPROTECTED then that value must be included as a Bearer token in the Authorization header of any calls to the endpoint.

We also suggest using IP filtering on your endpoints to only allow set IPs to access the issuer.  Set filtering in your nginx or similar.

Add a `TENANT_TOKEN_{TENANT_NAME}` environment variable to the [.coordinator.env](.coordinator.env) file.

#### Tenants Example

To set up two tenants, one for degrees and one for completion of the Econ101 course, and you wanted to secure the degrees tenant but not the Econ101, then you could create the tenants by setting the following in the [.signing-service.env](.signing-service.env) file:

```
TENANT_SEED_DEGREES=z1AoLPRWHSKasPH1unbY1A6ZFF2Pdzzp7D2CkpK6YYYdKTN
TENANT_SEED_ECON101=Z1genK82erz1AoLPRWHSKZFF2Pdzzp7D2CkpK6YYYdKTNat
```

and the following to the [.coordinator.env](.coordinator.env) file:

```
TENANT_TOKEN_DEGREE=988DKLAJH93KDSFV
```

The tenant names can then be specified in the issuing invocation like so:

```
http://myhost.org/instance/degrees/credentials/issue
http://myhost.org/instance/econ101/credentials/issue
```

And since you set a token for the degrees tenant, you'll have to include that token in the auth header as a Bearer token.  A curl command to issue on the degrees endpoint would then look like:

```
curl --location 'http://localhost:4005/instance/degrees/credentials/issue' \
--header 'Authorization: Bearer 988DKLAJH93KDSFV' \
--header 'Content-Type: application/json' \
--data-raw '{ 
  VC goes here
}'
```

### Revocation and Suspension

The issuer provides an optional revocation/suspension mechanism that implements [Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/), using [database services](https://github.com/digitalcredentials/credential-status-manager-db) or [Git services](https://github.com/digitalcredentials/status-list-manager-git) to store the status list. We recommend using the database implementation for production and test deployments and the Git implementation only for light testing/experimental purposes.

To enable status updates, set `ENABLE_STATUS_SERVICE` to `true` in `.coordinator.env`. To perform revocations and suspensions, see the [Usage - Revoking and Suspending](#revoking-and-suspending) section below.

### Environment Variables

These are all of the general environment variables that you will need to configure in `.coordinator.env`:

| Key | Description | Type | Required |
| --- | --- | --- | --- |
| `SIGNING_SERVICE` | domain of signing service | string | no (default: `SIGNER:4006`) |
| `STATUS_SERVICE` | domain of status service | string | no (default: `STATUS:4008`) |
| `TENANT_TOKEN_{TENANT_NAME}` | HTTP authorization bearer token to secure service endpoint access for a given tenant | string | yes |
| `PORT` | HTTP port on which to run the express app | number | no (default: `4005`) |
| `ENABLE_ACCESS_LOGGING` | whether to enable access logging | boolean | no (default: `true`) |
| `ENABLE_STATUS_SERVICE` | whether to enable status | boolean | no (default: `true`) |
| `ENABLE_HTTPS_FOR_DEV` | whether to enable HTTPS in a development instance of the app | boolean | no (default: `true`) |

These are the environment variables that you will need to configure in `.signing-service.env`:

| Key | Description | Type | Required |
| --- | --- | --- | --- |
| `TENANT_SEED_{TENANT_NAME}` | secret key deterministically associated with the issuer DID | string | yes |

In addition to the variables defined above, you will also need to provide environment bindings for status related configurations in `.status-service-db.env` or `.status-service-git.env`. Because there are two different implementations of a credential status manager - one for database storage and one for Git storage - you need to populate the appropriate file, depending on which one you want to use. For the database solution, please define at least the required fields specified [here](https://github.com/digitalcredentials/status-service-db/blob/main/README.md#environment-variables) and for the Git solution, please define at least the required fields specified [here](https://github.com/digitalcredentials/status-service-git/blob/main/README.md#environment-variables).

### DID Registries

To know that a credential was signed with a key that is in fact owned by the claimed issuer, the key (encoded as a DID) has to be confirmed as really belonging to that issuer.  This is typically done by adding the DID to a well known registry that the verifier checks when verifying a credential.

The DCC provides a number of registries that work with the verifiers in the Learner Credential Wallet and in the online web based [Verifier Plus](https://verifierplus.org).  The DCC registries use Github for storage.  To request that your DID be added to a registry, submit a pull request in which you've added your [DID](https://www.w3.org/TR/did-core/) to the registry file.

### did:key

For the moment, the issuer is set up to use the did:key implemenation of a DID which is one of the simpler implementations and doesn't require that the DID document be hosted anywhere.

### did:web

The did:web implementation is likely where most implementations will end up, and so you'll eventually want to move to becuase it allows you to rotate (change) your signing keys whithout having to update every document that points at the old keys.  We'll provide did:web support in time, but if you need it now just let us know.

## Usage

### Integration

This is meant to be used within a larger institutional system that already handles things like authentication and storage/retrieval of the user data (needed for the credential), and so simply passes that data to this system when the student requests the credential, at which point this system then largely handles the exchange with the wallet.

There are many ways to incorporate this system into your own flows. A typical flow might go something like:

* User opens web page to request a credential
* Page prompts user to authenticate, which is handled by campus authentication system
* After authentication, the student  TODO: continue on here

TODO: DESCRIBE other POSSIBLE CONFIGURATIONS

### Revoking and Suspending

Revocation and suspension are more fully explained in the [Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/) specification and our implemenations thereof, but effectively, it amounts to POSTing an object to the status update endpoint, like so:

```bash
curl --location 'http://localhost:4005/instance/test/credentials/status' \
--header 'Content-Type: application/json' \
--data-raw '{
	"credentialId": "urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1",
	"credentialStatus": [{
		"type": "BitstringStatusListCredential",
		"status": "revoked"
	}]
}'
```

The important part there is the `credentialId`. If an issuer provides an `id` field on a credential, the status service will pick this up and save the credential under this ID, as long as it is a valid VC ID, per [these guidelines](https://www.w3.org/TR/vc-data-model-2.0/#identifiers) (e.g., URL, URN). If an ID is not provided, the status service will automatically generate one and attach it to the credential as the `id` field.

It is important that you save this value in your system during the issuance process, as you will need it to perform revocations and suspensions in the future. A common approach might be to add another column to whatever local database you are using for your credential records, which would then later make it easier for you to find the ID you need by searching the other fields like student name or student ID.

**Note:** You'll of course have to enable [status updates](#revocation-and-suspension) for this to work. If you've only done the Quick Start then you'll not be able to revoke and suspend.

## Development

To run the `workflow-coordinator` locally from the cloned repository, you'll also have to clone the repository for the [signing-service](https://github.com/digitalcredentials/signing-service) and the [transaction-service](https://github.com/digitalcredentials/transaction-service) and have them running locally at the same time. Additionally, if you want to include status allocation, you'll also have to clone one of the status service repositories: [status-service-db](https://github.com/digitalcredentials/status-service-db), [status-service-git](https://github.com/digitalcredentials/status-service-git).

When running locally, the system picks up environment variables from the standard [.env](.env) file, rather than from the `.env` files that we recommend using with Docker Compose.

### Installation

Clone code, cd into the directory, and run:

```bash
npm install
npm run dev
```

### Testing

Testing uses `supertest`, `mocha`, and `nock` to test the endpoints. To run tests:

```bash
npm run test
```

Note that when testing we don't actually want to make live HTTP calls to the services, so we've used Nock to intercept the HTTP calls and return precanned data.

## Contribute

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT License](LICENSE.md) © 2023 Digital Credentials Consortium.
