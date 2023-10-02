# Digital Credentials Consortium workflow-coordinator

[![Build status](https://img.shields.io/github/actions/workflow/status/digitalcredentials/workflow-coordinator/main.yml?branch=main)](https://github.com/digitalcredentials/workflow-coordinator/actions?query=workflow%3A%22Node.js+CI%22)

A NodeJS Express server that coordinates micro-services within a Docker Compose Network to issue [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) to a wallet like the [Learner Credential Wallet (LCW)](https://lcw.app) using the [exchange protocol of the VC-API spec](https://w3c-ccg.github.io/vc-api/#initiate-exchange) and either the [Credential Handler API (CHAPI)](https://chapi.io) or the custom DCC deeplink protocol to select a wallet.

This is meant to be used within a larger institutional system that already handles authentication and storage/retrieval of the user data (needed for the credential), and so simply passes that data to this system after authentication, at which point this system then largely handles the exchange with the wallet.

NOTE: because this coordinator interacts with a wallet through the [exchange protocol of the VC-API spec](https://w3c-ccg.github.io/vc-api/#initiate-exchange), the coordinator has to be callable from the wallet, and for wallets that run on a phone, this can be tricky when trying this out locally. If you are new to this, you may want to first start by experimenting with the [DCC Issuer Coordinator](https://github.com/digitalcredentials/issuer-coordinator) which issuers credentials that can then be independently imported into a wallet.

We have also made available a public demonstration of the exchange, which you can try by opening this [link](https://issuer.dcconsortium.org/demo) from a web browser on the same phone on which you've installed the [Learner Credential Wallet (LCW)](https://lcw.app)

## Table of Contents

- [Summary](#summary)
- [Architecture](#architecture)
- [Wallet Exchange](#wallet-exchange)
- [API](#api)
- [Easy Start](#easy-start)
  - [Learner Credential Wallet](#learner-credential-wallet)
- [Versioning](#versioning)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Tenants](#tenants)
  - [Signing Key](#signing-key)
  - [DID Registries](#did-registries)
  - [did:key](#did-key)
  - [did:web](#did-web)
  - [Protecting Tenant Endpoints](#protecting-tenant-endpoints)
  - [Revocation](#revocation)
- [Usage](#usage)
  - [Integration](#integration)
  - [Issuing](#issuing)
  - [Revoking](#revoking)
- [Development](#development)
  - [Testing](#testing)
- [Contribute](#contribute)
- [License](#license)

## Summary

Use this server to issue [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) to a wallet like the [Learner Credential Wallet (LCW)](https://lcw.app). Credentials can optionally be allocated a [revocation status](https://www.w3.org/TR/vc-status-list/) that can later be used to revoke the credential.

The issued credentials are _assigned_ to a [Decentralized Identifier (DID)](https://www.w3.org/TR/did-core/) that the wallet provides (on behalf of the holder) to the issuer as part of the exchange. DIDs are effectively collections of cryptographic key pairs, which in this case later allow the holder to demonstrate that they control the credential by signing challenges using a private key associated with their DID.

## Architecture

This is an express app intended to run as a service within a Docker Compose network. This app coordinates calls to other express apps running as services within the same Docker Compose network, in particular:

* [DCC transaction-manager-service](https://github.com/digitalcredentials/transaction-manager-service)
* [DCC signing-service](https://github.com/digitalcredentials/signing-service)

and optionally also:

* [DCC credential-status-manager-git](https://github.com/digitalcredentials/credential-status-manager-git)
* [DCC template-service](https://github.com/digitalcredentials/template-service) (IN PROGRESS)

Note that all the calls to the internal services are only available within the Docker Compose network, and are not exposed externally.

Typical use would be to run this in combination with something like nginx-proxy and acme-companion (for the automated creation, renewal and use of SSL certificates) using docker-compose.  You may also run your own apps within the same Docker Compose network. You might, for example, run a react app with a user interface from which the student can request the credential. [Usage - Integration](#integration) further discusses how to incorporate this system into your own institutional system.

## Wallet Exchange

This issuer implements the [VC-API Exchange protocol](https://w3c-ccg.github.io/vc-api/) which in this case is essentially:

1. the wallet (controlled by the recipient/holder, e.g., a student) tells the issuer that it wants to start a specific exchange (in this case to get a specific credential, like a diploma)
2. the issuer replies, saying that the wallet must first provide a [Decentralized Identifier (DID)](https://www.w3.org/TR/did-core/) that belongs to the holder (i.e, the student), along with signed proof that the DID does in fact belong to the holder.
3. the wallet sends back the DID and proof (in a DIDAuth Verifiable Presentation)
4. the issuer verifies the proof and replies with the requested credential, issued to the supplied DID

NOTE: Issuing the credential to the holder's DID later allows the holder to prove that they _control_ the credential by using their DID to sign challenges from verifiers.

NOTE: we also provide an option to skip the first two steps so that the wallet can immediately post the DIDAuth after the deeplink opens it. This provides backwards compatability with wallets that implemented this simpler flow (for example as part of JFF PlugFest 2).

NOTE: We further provide a convenience endpoint that is not part of the VC-API spec and that effectively allows the institution to delegate most handling to an exchange coordinator by giving the exchange coordinator everything it needs to manage the exchange without further help from the institution. This is not part of the VC-API spec and is only meant to make implementation easier for the institution. This endpoint is called by institutional software at the point after the student has been authenticated by the institutianl authentication system and the data for the credential has been retrieved from the institutional data store. 

The flow looks like:

TODO: ADD DIAGRAM

## API

This system implements four public endpoints:

Three implement the [VC-API](https://w3c-ccg.github.io/vc-api/) spec:

 * [POST /exchange/{exchangeID}](https://w3c-ccg.github.io/vc-api/#initiate-exchange)
 * [POST /exchange/{exchangeID}/{transactionID}](https://w3c-ccg.github.io/vc-api/#initiate-exchange)
 * [POST /credentials/status](https://w3c-ccg.github.io/vc-api/#update-status)

And a fourth convenience endpoint that handles most of the exchange on behalf of the institution:

 * POST /exchange/setup

With this endpoint the institution posts a list of the unsigned verifiable credentials for which it wants deeplinks or a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) that can be used with the [Credential Handler API (CHAPI)](https://chapi.io). The posted object should have the following structure:

```
{
	"tenantName": "someTenantName",
	"data": [
		{"vc": someVCGoesHere, "retrievalId": anIdWithWhichToIdentifyThisVCInTheResult},
		{"vc": anotherVCGoesHere, "retrievalId": aDifferentRetrievalId},
		... however many more vcs you want to post
	]
}
```

If the tenant is protected with a token, then the token must be submitted in the authorization header as a bearer token. See the [Tenants](#add-tenants) section.

For example, to post the data for a single credential to an unprotected tenant:

```json
{
	"tenantName": "UN_PROTECTED_TEST",
	"data": [{
		"vc": {
			"@context": ["https://www.w3.org/2018/credentials/v1", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.2.json", "https://w3id.org/vc/status-list/2021/v1"],
			"id": "urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1",
			"type": ["VerifiableCredential", "OpenBadgeCredential"],
			"issuer": {
				"id": "did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC",
				"type": "Profile",
				"name": "University of Wonderful",
				"description": "The most wonderful university",
				"url": "https://wonderful.edu/",
				"image": {
					"id": "https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png",
					"type": "Image"
				}
			},
			"issuanceDate": "2020-01-01T00:00:00Z",
			"name": "A Simply Wonderful Course",
			"credentialSubject": {
				"type": "AchievementSubject",
				"achievement": {
					"id": "http://wonderful.wonderful",
					"type": "Achievement",
					"criteria": {
						"narrative": "Completion of the Wonderful Course - well done you!"
					},
					"description": "Wonderful.",
					"name": "Introduction to Wonderfullness"
				}
			}
		},
		"retrievalId": "someId"
	}]
}
```


The endpoint returns a json object that provides three options for selecting a wallet:

 * [a _direct_ custom DCC deeplink](#deeplink)
 * [a _vpr_ custom DCC deeplink](#deeplink)
 * a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) 

And example of the returned object:

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

The **retrievalId** is used to identify the result for each credential when more than one credential has been posted in the same post. The issuer supplies these retrievalIds when posting the data. The retrievalId can be anything that makes sense for the issuer.

The **directDeepLink** will open the [Learner Credential Wallet](https://lcw.app) after which the wallet invokes the **vc_request_url** that is passed as a query parameter on the deeplink, and gets the signed VC back immediately.

The **vprDeepLink** will open the [Learner Credential Wallet](https://lcw.app) after which the wallet similarly invokes the **vc_request_url** but in this case the result of that call is a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/)  request for a DIDAuth. So this is a two step exchange whereas the directDeepLink is a one step exchange. **IMPORTANT NOTE**: this flow has not yet been implemented in the [Learner Credential Wallet](https://lcw.app).

The **chapiVPR** is a [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/)  that is meant to be used with a [Credential Handler API (CHAPI)](https://chapi.io) _get_ call to pass the [VPR](https://w3c-ccg.github.io/vp-request-spec/)  into a wallet which will then make a call to the exchange endpoint to get back the signed verifiable credential. **IMPORTANT NOTE**: this flow has not yet been implemented in the [Learner Credential Wallet](https://lcw.app).

The institutional software then offers the student the appropriate option. For an example of how this would work look at the GET /demo endpoint which demonstrates with a working example how an institution would use the exchange-coordinator.

## Easy Start

We've tried hard to make this as simple as possible to install and maintain, but also easy to evaluate and understand as you consider whether digital credentials are useful for your project, and whether this issuer would work for you.

Installing and running the issuer is straightforward and should take less than five minutes in total. The trickier part is exposing your coordinator so that a wallet can make calls to your coordinator. We describe some approaches further below.

### Install Docker

Docker have made this very easy, with [installers for Windows, Mac, and Linux](https://docs.docker.com/engine/install/) that make it as easy to install as any other application.

### Make a Docker Compose file

Create a file called docker-compose.yml and add the following

```
version: '3.5'
services:
  exchange-coordinator:
    image: digitalcredentials/exchange-coordinator:0.1.0
    ports:
      - "4005:4005"
  signing-service:
    image: digitalcredentials/signing-service:0.1.0
  transaction-service:
    image: digitalcredentials/transaction-service:0.1.0
```

Note that as of this writing (October 2nd 2023), the versions of each image are at 0.1.0. These will change over time. Read more in [Versioning](#versioning).

### Run it

From the terminal in the same directory that contains your docker-compose.yml file:

```docker compose up```

### Issue

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

The workflow-coordinator and the services it coordinates are all intended to run as docker images within a docker compose network. For convenience we've published those images to Docker Hub so that you don't have to build them locally yourself from the github repositories.

The images on Docker Hub will of course be updated to add new functionality and fix bugs. Rather than overwrite the default (`latest`) version on Docker Hub for each update, we've adopted the [Semantic Versioning Guidelines](https://semver.org) with our docker image tags.

We DO NOT provide a `latest` tag so you must provide a tag name (i.e, the version number) for the images in your docker compose file, as we've done [here](./docker-compose.yml).

To ensure you've got compatible versions of the services and the coordinator, the `major` number for each should match. At the time of writing, the versions for each are at 0.1.0, and the `major` number (the leftmost number) agrees across all three.

If you do ever want to work from the source code in the repository and build your own images, we've tagged the commits in Github that were used to build the corresponding Docker image. So a github tag of v0.1.0 coresponds to a docker image tag of 0.1.0

## Configuration 

There are a few things you'll want to configure, in particular setting your own signing keys (so that only you can sign your credentials). Other options include enabling revocation, or allowing for 'multi-tenant' signing, which you might use, for example, to sign credentials for different courses with a different key.

The app is configured with three .env files:

* [.coordinator.env](./.coordinator.env)
* [.signing-service.env](./.signer.env)
* [.status-service.env](./.signer.env)

You can simply uncomment the lines in this [docker-compose.yml](./docker-compose.yml) to use the default .env files that are included in this repo. You'll of course have to modify the contents of the .env files as described in this README.

### Change Default Signing key

The issuer is pre-configured with a default signing key that can only be used for testing and evaluation. Any credentials signed with this key are meaningless because anyone else can use it to sign credentials, and so could create fake copies of your credentials which would appear to be properly signed. There would be no way to know that it was fake.

TODO: may want to by default auto-generate an ephemeral key on startup, that only lasts for the life of the process. Upside is that it wouldn't validate in any registry and so would force people to generate and set their own key. Downside is that credentials wouldn't validate, and so wouldn't demonstrate that functionality, but on the hand, would demonstrate failed verification.

#### Generate a new key

To issue your own credentials you must generate your own signing key and keep it private.  We've tried to make that a little easier by providing a convenience endpoint in the issuer that you can use to generate a brand new key.  You can hit the endpoint with the following CURL command (in a terminal):

`curl --location 'http://localhost:4007/seedgen'`

This will return a json document with:

- a seed
- the corresponding DID
- the corresponding DID Document

The returned result will look something like this:

```
{
	"seed": "z1AjQUBZCNoiyPUC8zbbF29gLdZtHRqT6yPdFGtqJa5VfQ6",
	"did": "did:key:z6MkweTn1XVAiFfHjiH48oLknjNqRs43ayzguc8G8VbEAVm4",
	"didDocument": {
		"@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1", "https://w3id.org/security/suites/x25519-2020/v1"],
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

Now that you've got your key you'll want to set it...

#### Set Signing Key

Signing keys are set as 'seeds' in the [.signer.env](.signer.env) file for the signer-service. 

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

Adding a tenant is simple. Just add another `TENANT_SEED_{TENANT_NAME}` environment variable in [.signer.env](.signer.env). The value of the variable should be a seed. Generate a new seed as explained in [Generate a new key](#generate-a-new-key), and set it as explained for the default tenant in [Set Signing Key](#set-signing-key).

#### Declare Tenant Endpoints

Tenant endpoints must be add to [.coordinator.env](.coordinator.env) and given a value of either 'UNPROTECTED' or some arbitrary value of your choosing (like a UUID). If you set a value other than UNPROTECTED then that value must be included as a Bearer token in the Authorization header of any calls to the endpoint.

We also suggest using IP filtering on your endpoints to only allow set IPs to access the issuer.  Set filtering in your nginx or similar.

Add a `TENANT_TOKEN_{TENANT_NAME}` environment variable to the [.coordinator.env](.coordinator.env) file.

#### Tenants Example

To set up two tenants, one for degrees and one for completion of the Econ101 course, and you wanted to secure the degrees tenant but not the Econ101, then you could create the tenants by setting the following in the [.signer.env](.signer.env) file:

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
curl --location 'http://localhost:4007/instance/degrees/credentials/issue' \
--header 'Authorization: Bearer 988DKLAJH93KDSFV' \
--header 'Content-Type: application/json' \
--data-raw '{ 
  VC goes here
}'
```

### Enable Revocation

The issuer provides an optional revocation (or 'status') mechanism that implements the [StatusList2021 specification](https://www.w3.org/TR/vc-status-list/), using Github to store the access list. So to use the list you'll have to create two new github repositories that will be used exclusively to manage the status.  Full details of the implementation are [here](https://github.com/digitalcredentials/status-list-manager-git)

For this MVP implementation of the issuer we've only exposed the github options, but if you would like to use gitlab instead, just let us know and we can expose those options.

Revoking a credential is described in [Usage - revoking](#revoking)

#### Create Github repositories

Create two repositories, one public and one private. Call them anything you like, but something like myproject-status-list (public) and myproject-status-list-meta (private) are good choices. If you need help, instructions are [here](https://github.com/digitalcredentials/credential-status-manager-git#create-credential-status-repositories)

Get a Github token with access to the repositories as described [here](https://github.com/digitalcredentials/credential-status-manager-git#generate-access-tokens)

Now set these in the [.status.env](.status.env) file, which has the following options:

| Key | Description | Default | Required |
| --- | --- | --- | --- |
| `PORT` | http port on which to run the express app | 4008 | no |
| `CRED_STATUS_OWNER` | name of the owner account (personal or organization) in the source control service that will host the credential status resources | no | yes if ENABLE_STATUS_ALLOCATION is true |
| `CRED_STATUS_REPO_NAME` | name of the credential status repository | no | yes if ENABLE_STATUS_ALLOCATION is true |
| `CRED_STATUS_META_REPO_NAME` | name of the credential status metadata repository | no | yes if ENABLE_STATUS_ALLOCATION is true |
| `CRED_STATUS_ACCESS_TOKEN` | Github access token for the credential status repositories | no | yes if ENABLE_STATUS_ALLOCATION is true |
| `CRED_STATUS_DID_SEED` | seed used to deterministically generate DID | no | yes if ENABLE_STATUS_ALLOCATION is true |

The `CRED_STATUS_DID_SEED` is set to a default seed, usable by anyone for testing. You'll have to change that to use your own seed. Follow the instructions in [Generate a new Key](#generate-a-new-key) to generate a new key seed, and set the value (from the 'seed' property of the object returned from the seed generator). 

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

### Revoking

Revocation is more fully explained in the StatusList2021 specification and the DCC [git based status implemenation](https://github.com/digitalcredentials/credential-status-manager-git), but it amounts to POSTing an object to the revocation endpoint, like so:

```
{
	credentialId: 'id_added_by_status_manager_to_credentialStatus_propery_of_VC',
	credentialStatus: [{
		type: 'StatusList2021Credential',
		status: 'revoked'
	}]
}
```

The important part there is the `credentialId`, which is listed in the `credentialStatus` section of the issued credential (`credentialStatus` is added by the status service), and which you have to store at the point when you issue the credential. The `credentialStatus` section looks like this:

```
"credentialStatus": {
        "id": "https://digitalcredentials.github.io/credential-status-jc-test/XA5AAK1PV4#16",
        "type": "StatusList2021Entry",
        "statusPurpose": "revocation",
        "statusListIndex": 16,
        "statusListCredential": "https://digitalcredentials.github.io/credential-status-jc-test/XA5AAK1PV4"
    }
```

and the id you need is in the `id` property.

So again, the important point here is that you must store the credentialStatus.id for all credentials that you issue. A common approach might be to add another column to whatever local database you are using for your credential records, which would then later make it easier for you to find the id you need by searching the other fields like student name or student id.

NOTE: you'll of course have to have [set up revocation](#enable-revocation) for this to work. If you've only done the QuickStart then you'll not be able to revoke.

## Development

To run the exchange-coordinator locally from the cloned repository (rather than using docker compose to pull in docker hub images), you'll also have to clone the repository for the other services that this coordinator calls:

* [signing-service](https://github.com/digitalcredentials/signing-service) 
* [transaction-service](https://github.com/digitalcredentials/transaction-service)

and optionally, if you are allocating a status position for revocation:

* [status-service](https://github.com/digitalcredentials/signing-service)

and have them all running locally at the same time.

When running locally, the system picks up environment variables from the standard [.env](./.env) file, rather than from the env files that we recommend using with docker compose.

### Installation

Clone code then cd into directory and:

```
npm install
npm run dev
```

If for whatever reason you need to run the server over https, you can set the `ENABLE_HTTPS_FOR_DEV` environment variable to true.  Note, though, that this should ONLY be used for development.

### Testing

Testing uses supertest, mocha, and nock to test the endpoints.  To run tests:

```npm run test```

This coordinator coordinates http calls out to other services, but rather than have to make these calls for every test, and possibly in cases where outgoing http calls aren't ideal, we've used [nock](https://github.com/nock/nock) to mock out the http calls so that the actual calls needn't be made - nock instead returns our precanned replies.

## Contribute

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT License](LICENSE.md) © 2023 Digital Credentials Consortium.
