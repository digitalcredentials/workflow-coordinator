# Digital Credentials Consortium exchange-coordinator

A NodeJS Express server that coordinates micro-services within a Docker Compose Network to issue [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) to a wallet like the [Learner Credential Wallet (LCW](https://lcw.app) using the [exchange protocol of the VC-API spec](https://w3c-ccg.github.io/vc-api/#initiate-exchange) and either the [Credential Handler API (CHAPI)](https://chapi.io) or the custom DCC deeplink protocol to select a wallet.

This is meant to be used within a larger system - that often already exists - and that handles authentication and storage/retrieval of the user data (needed for the credential), and simply passes that data to this system after authentication, at which point this system then largely handles the exchange with the wallet.

## Table of Contents

- [Summary](#summary)
- [Architecture](#architecture)
- [Wallet Exchange](#wallet-exchange)
- [API](#api)
- [Easy Start](#easy-start)
  - [Learner Credential Wallet](#learner-credential-wallet)
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
  - [Issuing](#issuing)
  - [Revoking](#revoking)
  - [Architecture](#architecture)
- [Development](#development)
  - [Testing](#testing)
- [Contribute](#contribute)
- [License](#license)

## Summary

Use this server to issue [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) to a wallet like the [Learner Credential Wallet (LCW](https://lcw.app). The credential can optionally be allocated a [revocation status](https://www.w3.org/TR/vc-status-list/) that can in turn later be used to revoke the credential.

The issued credentials are `assigned` to a [Decentralized Identifier (DID)](https://www.w3.org/TR/did-core/) that the wallet (on behalf of the holder) provides to the issuer as part of the exchange. DIDs are effectively collections of cryptographic key pairs, which in this case later allow the holder to demonstrate that they control the credential by using a private key associated with their DID to sign challenges.

## Architecture

This is an express app intended to run as a service within a Docker Compose network. This app coordinates calls to other express apps running as services within the same Docker Compose network, in particular:

* [DCC transaction-manager-service](https://github.com/digitalcredentials/transaction-manager-service)
* [DCC signing-service](https://github.com/digitalcredentials/signing-service)

and optionally also:

* [DCC credential-status-manager-git](https://github.com/digitalcredentials/credential-status-manager-git)
* [DCC template-service](https://github.com/digitalcredentials/template-service) (IN PROGRESS)

Note that all the calls to the internal services are only available within the Docker Compose network, and are not exposed externally.

Typical use would be to run this in combination with something like nginx-proxy and acme-companion (for the automated creation, renewal and use of SSL certificates) using docker-compose.  You may also run your own apps within the same Docker Compose network. You might, for example, run a react app with a user interface from which the student can request the credential. [Usage - Integration] has a longer discussion about how to incorporate this system into your own institutional system.

## Wallet Exchange

This issuer implements the [VC-API Exchange protocol](https://w3c-ccg.github.io/vc-api/) which in this case is essentially:

1. the wallet (controlled by the recipient/holder, e.g., a student) tells the issuer that it wants to start a specific exchange (in this case to get a specific credential, like a diploma)
2. the issuer replies, saying that the wallet must first provide a [Decentralized Identifier (DID)](https://www.w3.org/TR/did-core/) that belongs to the holder (i.e, the student), along with signed proof that the DID does in fact belong to the holder.
3. the wallet sends back the DID and proof (in a DIDAuth Verifiable Presentation)
4. the issuer verifies the proof and replies with the requested credential, issued to the supplied DID

NOTE: Issuing the credential to the holder's DID later allows the holder to prove that they 'control' the credential by using their DID to sign challenges from verifiers.

NOTE: we also provide an option to skip the first two steps so that the wallet can immediately post the DIDAuth from the deeplink or chapi request. This provides backwards compatability with wallets that implemented this simpler flow (for example as part of JFF PlugFest 2).

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

 * POST /instance/{instanceID}

The 'instanceID' declares which signing DID should be used to sign the resulting credential (NOTE: this could instead go in the posted data.)

The institution posts all the data needed to construct the credential, including subject data, credential 'type' (e.g., bachelors of science, masters of public policy, etc.) as a json object with the following structure:

```
{
    "callback":"http://someurl",
    "data":"data to later be used to build a Verifiable Credential using a template",
    "vc":"alterntively can supply the populated, unsigned, Verifiable Credential",
    "batchID": "defines the 'type' of the credential like which template to use",
    "tenant": "specifies which signing DID to use",
    "auth": "token which authorizes use of the specified signing DID",
    "flow": "direct/vpr"
}
```
The endpoint returns a json object that provides two options for selecting a wallet:

 * [CHAPI](#chapi)
 * [custom DCC deeplink](#deeplink)

It also returns a:

* [Verifiable Presentation Request (VPR)](https://w3c-ccg.github.io/vp-request-spec/) 

Which can be used for other flows, for example where the deeplink is known in advance (say when emailing out the deeplink to a student). In these cases, when the wallet invokes the deeplink you simply want to setup the exchange (and in particular generate the challenge) and then send the VPR 
directly back to the wallet.

The returned object looks like:

```
{
    walletQuery: [
        {
            type: "deeplink",
            url: "dccrequest://request?vc_request_url=/exchanges/instances/CS_Dept/exchanges/<random token TX Mgr uses to store batch id, user id & user data>/"
        },
        {
            type: "chapi"
            query: { <query goes here, see below> }
        }
    ],
    verifiablePresentationRequest: {
        "query": [{ "type": "DIDAuthentication" }],
        "challenge": SOME_CHALLENGE,
        "domain": THE_DOMAIN_FOR_THE_EXCHANGE,
        "interact": {
            "service": [{
            "type": "UnmediatedPresentationService2021",
            "serviceEndpoint": CONTINUTATION_ENDPOINT, I.E., exchangeHost/exchange/exchangeId/transactionId
            }]
        }
    }
  }
}

```

The institutional software then offers the student the appropriate option. For an example of how this would work look at the GET /demo endpoint which demonstrates with a working example how an institution would use the exchange-coordinator.

## Easy Start

We've tried hard to make this as simple as possible to install and maintain, but also easy to evaluate and understand as you consider whether digital credentials are useful for your project, and whether this issuer would work for you. 

These four step should take less than five minutes in total:

### Install Docker

Docker have made this very easy, with [installers for Windows, Mac, and Linux](https://docs.docker.com/engine/install/) that make it as easy to install as any other application.

### Make a Docker Compose file

Create a file called docker-compose.yml and add the following

```
version: '3.5'
services:
  exchange-coordinator:
    image: digitalcredentials/exchange-coordinator
    ports:
      - "4005:4005"
  signing-service:
    image: digitalcredentials/signing-service
  transaction-service:
    image: digitalcredentials/transaction-service
```

The [docker-compose.yml](./docker-compose.yml) file in this repository is identical so you can just use that if you've cloned this repository.

### Run it

From the terminal in the same directory that contains your docker-compose.yml file:

```docker compose up```

### Issue

Issue a test credential by opening this url in your web browser:

[http://localhost:4005/demo](http://localhost:4005/demo)

This will take you through the exchange between a wallet and this issuer. The web page plays the part of the wallet (which is normally an app on your phone). 

To instead actually issue to the [Learner Credential Wallet (LCW](https://lcw.app) running on your phone, you'll have to tell your phone where the issuer is running. You can do that by following these [instructions](https://dev.to/shaundai/using-localhost-for-mobile-development-1k4g) which tells you how to find the IP on which your laptop is running in your local network, and then open the following URL from a web browser on your laptop (replacing YOUR_IP with the IP you just determined):

`http://YOUR_IP:4005/lcw-demo`

This should trigger the opening of the LCW app on your phone, with a prompt to download a credential.

NEXT STEP: you'll soon want to issue your own credential, signed with your own keys. Continue on to [Setup](#setup) to find out how to do configure the Docker Compose network to do just that.

NOTE: Revocation is not enabled in the Quick Start. You've got to setup a couple of things to [ENABLE REVOCATION](#create-github-repositories), but you'll probably first want to configure the other parts of the application, make sure they work, and then enanble revocation. So let's get setup...

## Configuration 


There are a few things you'll want to configure, in particular setting your own signing keys (so that only you can sign your credentials). Other options include enabling revocation, or allowing for 'multi-tenant' signing, which you might use, for example, to sign credentials for different courses with a different key.

The app is configured with three .env files:

* [.coordinator.env](./.coordinator.env)
* [.signing-service.env](./.signer.env)
* [.status-service.env](./.signer.env)

If you've used the QuickStart docker-compose.yml, then you'll have to point it at these files. We've pre-configured this [docker-compose.yml](./docker-compose.yml), though, so you can just use that.

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

Note that this sets a key for the default tenant, but you can set up as many tenants as you like as explained in the [Add Tenants](#tenants) section. 

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

This is meant to be used within a larger system - that often already exists - and that handles things like authentication and storage/retrieval of the user data (needed for the credential), and simply passes that data to this system when the student requests the credential, at which point this system then largely handles the exchange with the wallet.

There are many ways to incorporate this system into your own flows. A typical flow might go something like:

* User opens web page to request a credential
* Page prompts user to authenticate, which is handled by campus authentication system
* After authentication, the student  TODO: continue on here

TODO: DESCRIBE other POSSIBLE CONFIGURATIONS

### Issuing

#### Managed endpoint

There are a few ways to use this when it comes time to issue your own credentials, but the easiest is to use our 'managed' endpoint, where we coordinate the different calls to the VC-API endpoints for you:

`POST /exchange/setup`

You simply post up an object like the following which will trigger the exchange with the wallet. You'd typically call that endpoint when the holder (student) clicks a button on your web page (which the student should have opened while on their phone) to get the credential. That button click might then call your server-side code which gets the data for the credential from your data store and then you post.

You can now try issuing a cryptographically signed credential to the [Learner Credential Wallet (LCW](https://lcw.app).  Try it out with this CURL command, which you simply paste into the terminal:

```
curl --location 'http://localhost:3000/instance/test/credentials/issue' \
--header 'Content-Type: application/json' \
--data-raw '{ 
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context.json"
  ],
  "id": "urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1", 
  "type": [
    "VerifiableCredential",
    "OpenBadgeCredential"
  ],
  "issuer": {
    "id": "the issuer code will set this as the issuing DID", 
    "type": "Profile",
    "name": "DCC Test Issuer",
    "description": "A test DID used to issue test credentials",
    "url": "https://digitalcredentials.mit.edu",
    "image": {
	    "id": "https://certificates.cs50.io/static/success.jpg",
	    "type": "Image"
	  }	
  },
  "issuanceDate": "2020-01-01T00:00:00Z", 
  "expirationDate": "2025-01-01T00:00:00Z",
  "name": "Successful Installation",
  "credentialSubject": {
      "type": "AchievementSubject",
     "name": "Me!",
     "achievement": {
      	"id": "http://digitalcredentials.mit.edu",
      	"type": "Achievement",
      	"criteria": {
        	"narrative": "Successfully installed the DCC issuer."
      	},
      	"description": "DCC congratulates you on your successful installation of the DCC Issuer.", 
      	"name": "Successful Installation",
      	"image": {
	    	"id": "https://certificates.cs50.io/static/success.jpg",
	    	"type": "Image"
	  	}
      }
  	}
}'
```

This should return a fully formed and signed credential printed to the terminal, that should look something like the following ( it will be all smushed up, but you can format it in something like [json lint](https://jsonlint.com)):


```
{
	"@context": ["https://www.w3.org/2018/credentials/v1", "https://purl.imsglobal.org/spec/ob/v3p0/context.json", "https://w3id.org/vc/status-list/2021/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
	"id": "urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1",
	"type": ["VerifiableCredential", "OpenBadgeCredential"],
	"issuer": {
		"id": "did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy",
		"type": "Profile",
		"name": "DCC Test Issuer",
		"description": "A test DID used to issue test credentials",
		"url": "https://digitalcredentials.mit.edu",
		"image": {
			"id": "https://certificates.cs50.io/static/success.jpg",
			"type": "Image"
		}
	},
	"issuanceDate": "2020-01-01T00:00:00Z",
	"expirationDate": "2025-01-01T00:00:00Z",
	"name": "Successful Installation",
	"credentialSubject": {
		"type": "AchievementSubject",
		"name": "Me!",
		"achievement": {
			"id": "http://digitalcredentials.mit.edu",
			"type": "Achievement",
			"criteria": {
				"narrative": "Successfully installed the DCC issuer."
			},
			"description": "DCC congratulates you on your successful installation of the DCC Issuer.",
			"name": "Successful Installation",
			"image": {
				"id": "https://certificates.cs50.io/static/success.jpg",
				"type": "Image"
			}
		}
	},
	"proof": {
		"type": "Ed25519Signature2020",
		"created": "2023-05-19T14:47:25Z",
		"verificationMethod": "did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy#z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy",
		"proofPurpose": "assertionMethod",
		"proofValue": "zviQazCEMihts4e6BrhxkEu5VbCPFqTFLY5qBkiRztf3eq1vXYXUCQrTL6ohxmMrsAPEJpB9WGbN1NH5DsSDHsCU"
	}
}
```

NOTE: this easy-start version does not allow for revocation. Read on to see how you can configure it for revocation.

NOTE: CURL can get a bit clunky if you want to experiment, so you might consider trying [Postman](https://www.postman.com/downloads/) which makes it very easy to construct and send http calls.

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

### Installation

Clone code then cd into directory and:

```
npm install
npm run dev
```

If for whatever reason you need to run the server over https, you can set the `ENABLE_HTTPS_FOR_DEV` environment variable to true.  Note, though, that this should ONLY be used for development.

### Testing

Testing uses supertest, jest, and nock to test the endpoints.  To run tests:

```npm run test```

Because the revocation (status) system uses github to store status, calls are made out to github during issuance.  Rather than have to make these calls for every test, and possibly in cases where outgoing http calls aren't ideal, we've used [nock](https://github.com/nock/nock) to mock out the http calls to the github api, so that the actual calls needn't be made - nock instead returns our precanned replies.  Creating mocks can be time consuming, though, so we've also opted to use the recording feature of nock which allows us to run the tests in 'record' mode which will make the real calls out to Github, and record the results so they can be used for future calls.

## Contribute

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT License](LICENSE.md) © 2023 Digital Credentials Consortium.
