import nock from 'nock';
import { expect } from 'chai'
import request from 'supertest';
import crypto from 'crypto';
import { getDataForExchangeSetupPost } from './test-fixtures/vc.js';
import directTestNocks from './test-fixtures/nocks/directTest.js'
import unprotectedWalletQueryNock from './test-fixtures/nocks/unprotectedWalletQuery.js'
import protectedWalletQueryNock from './test-fixtures/nocks/protectedWalletQuery.js';
import unProtectedRandomWalletQuery from './test-fixtures/nocks/unProtectedRandomWalletQuery.js';
import vprTestNocks from './test-fixtures/nocks/vprTest.js'
import unknownStatusListNock from './test-fixtures/nocks/unknown_status_list_nock.js'
import statusListNock from './test-fixtures/nocks/status_list_nock.js'
import didWebGeneratorNock from './test-fixtures/nocks/did-web-generator.js'
import unprotectedStatusUpdateNock from './test-fixtures/nocks/unprotected_status_update.js'
import unknownStatusIdNock from './test-fixtures/nocks/unknown_status_id_nock.js'
import didKeyGeneratorNock from './test-fixtures/nocks/did-key-generator.js'

import { getSignedDIDAuth } from './didAuth.js';

import { build } from './app.js';
import { resetConfig } from './config.js'

const exchangeSetupPath = '/exchange/setup'
const unprotectedTenantName = "UN_PROTECTED_TEST"
const protectedTenantName = "PROTECTED_TEST"
const protectedTenantName2 = "PROTECTED_TEST_2"
const randomTenantName = "RANDOM_TEST"

let unprotectedTenantToken
let protectedTenantToken
let testTenantToken2
let randomToken

let statusUpdateBody
let app

const noMatchHandler = req => {
  if (req.path !== exchangeSetupPath) {
    throw new Error(`Unexpected request was sent to ${req.host}${req.path}`)
  }
}

const checkForUnexpectedCalls = () => {
  nock.emitter.on('no match', noMatchHandler);
}

//nock.recorder.rec()


describe('api', () => {

  before(async () => {
    unprotectedTenantToken = process.env[`TENANT_TOKEN_${unprotectedTenantName}`]
    protectedTenantToken = process.env[`TENANT_TOKEN_${protectedTenantName}`]
    testTenantToken2 = process.env[`TENANT_TOKEN_${protectedTenantName2}`]
    randomToken = process.env[`TENANT_TOKEN_${randomTenantName}`]
    statusUpdateBody = { "credentialId": "urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1", "credentialStatus": [{ "type": "BitstringStatusListCredential", "status": "revoked" }] }
  });

  
  after(() => {

  })

  beforeEach(async () => {
    app = await build();
    if (!nock.isActive()) nock.activate()
  });

  afterEach(async () => {
    // we have to clean up nock after each test, otherwise it
    // might disallow calls that it shouldn't; or alternatively
    // intercept calls it shouldn't
    nock.restore()
    nock.emitter.removeListener('no match', noMatchHandler)
  });

  describe('GET /', () => {
    it('GET / => hello', done => {
      
      nock('http://localhost:4006').get("/").reply(200, 'signing-service server status: ok.')
      nock('http://localhost:4008').get("/").reply(200, 'status-service server status: ok.')
      nock('http://localhost:4004').get("/").reply(200, 'transaction-service server status: ok.')
      
      request(app)
        .get("/")
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(/{"message":"workflow-coordinator, transaction-service, and signing-service all ok. status-service is disabled."}/, done);

    });
  })

  describe('GET /unknown', () => {
    it('unknown endpoint returns 404', done => {
      request(app)
        .get("/unknown")
        .expect(404, done)
    }, 10000);
  })

  describe(`POST ${exchangeSetupPath}`, () => {

    it('returns 400 if no body', done => {
      request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${protectedTenantToken}`)
        .expect('Content-Type', /json/)
        .expect(400, done)
    })

    it('returns 401 if tenant token is missing from auth header', done => {
      request(app)
        .post(exchangeSetupPath)
        .send(getDataForExchangeSetupPost(protectedTenantName))
        .expect('Content-Type', /json/)
        .expect(401, done)
    })

    it('returns wallet query for UNPROTECTED tenant, without auth header', async () => {
      
    unprotectedWalletQueryNock();

      const response = await request(app)
        .post(exchangeSetupPath)
        .send(getDataForExchangeSetupPost(unprotectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)
    })

    it('returns wallet query for PROTECTED tenant, with auth header', async () => {
     protectedWalletQueryNock();
      
      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${protectedTenantToken}`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)
    })

    it('returns wallet query for random UNPROTECTED tenant, with auth header', async () => {
      unProtectedRandomWalletQuery()
      //nock.recorder.rec()
      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${randomToken}`)
        .send(getDataForExchangeSetupPost(randomTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)
    })

    it('returns 403 if token is not valid', async () => {

      // no calls to the services should be made
      checkForUnexpectedCalls(exchangeSetupPath)

      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer badbadToken`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(403);
      expect(response.body)

    })

    it('returns 403 when trying to use token for a different tenant', async () => {

      // no calls to the services should be made
      checkForUnexpectedCalls(exchangeSetupPath)

      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${randomToken}`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(403);
      expect(response.body)


    })

    it('returns 401 if token is not marked as Bearer', async () => {
      
      // no calls to the services should be made
      checkForUnexpectedCalls(exchangeSetupPath)

      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `${protectedTenantToken}`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(401);
      expect(response.body)
    })
  })

  describe('POST /exchange', () => {

    it('does the direct exchange', async () => {
    
      directTestNocks()
      /*
         A test that mocks both the wallet part of the interaction, and the 
         'issuer coordinator app' (i.e, the university specific code that uses the
         workflow coordinator), so that the flow can more easily be
         tested, without needing to redirect into an actual running wallet.
         NOTE: THIS TESTS WITHOUT THE INTERMEIDATE VPR step
         */

      // Step 1. Mimics what the school/uni code would do, which is to setup the 
      // exchange by passing in a VC that is pre-populated with student data.
      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet

      const exchangeSetupData = getDataForExchangeSetupPost(unprotectedTenantName)
      const response = await request(app)
        .post(exchangeSetupPath)
        .send(exchangeSetupData)
      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)

      const walletQuerys = response.body
      const walletQuery = walletQuerys.find(q => q.retrievalId === 'someId')
      const url = walletQuery.directDeepLink

      // Step 2. Now that we've got the deeplink, we would redirect to it, which
      // would open the wallet. In this test, we're just assuming that this has already
      // happened, and that now we are in the wallet

      // Step 3. Mimics what the wallet would do when opened by deeplink
      // which is to parse the deeplink, construct a DIDAuth and call
      // the /exchange/:exchangeId/:transactionId continutation endpoint
      // which it got from the deeplink, posting in the didAuth.
      // The continuation endpoint checks the didAuth, gets the VC from the transaction manager,
      // signs and returns it.

      const parsedDeepLink = new URL(url)
      const requestURI = parsedDeepLink.searchParams.get('vc_request_url'); //should be http://localhost:4004/exchange?challenge=VOclS8ZiMs&auth_type=bearer
      // here we need to pull out just the path
      // since we are calling the endpoint via
      // supertest
      const path = (new URL(requestURI)).pathname
      const challenge = parsedDeepLink.searchParams.get('challenge'); // the challenge that the exchange service generated 
      const didAuth = await getSignedDIDAuth('did:ex:223234', challenge)

      const exchangeResponse = await request(app)
        .post(path)
        .send(didAuth)

      expect(exchangeResponse.header["content-type"]).to.have.string("json");
      expect(exchangeResponse.status).to.eql(200);
      expect(exchangeResponse.body)

      const signedVC = exchangeResponse.body
      expect(signedVC.proof).to.exist

    });


    it('does the vpr exchange', async () => {
      vprTestNocks()
      /*
      A test that mocks both the wallet part of the interaction, and the 
      'issuer coordinator app' (i.e, the university specific code that uses the
      workflow coordinator), so that the flow can be
      tested without needing to redirect into an actual running wallet.
      NOTE: this tests with the intermediate VPR step
      */
      // Step 1. Mimics what the school/uni code would do, which is to setup the 
      // exchange by passing in a VC that is pre-populated with student data.
      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet

      const setupResponse = await request(app)
        .post(exchangeSetupPath)
        .send(getDataForExchangeSetupPost(unprotectedTenantName))
      expect(setupResponse.header["content-type"]).to.have.string("json");
      expect(setupResponse.status).to.eql(200);
      expect(setupResponse.body)

      const walletQuerys = setupResponse.body

      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet
      const walletQuery = walletQuerys.find(q => q.retrievalId === 'someId')
      const url = walletQuery.vprDeepLink

      // Step 2. mimics what the wallet would do when opened by deeplink
      // which is to parse the deeplink and call the exchange initiation endpoint
      const parsedDeepLink = new URL(url)
      const initiationURI = parsedDeepLink.searchParams.get('vc_request_url');

      // strip out the host because we are using supertest
      const initiationURIPath = (new URL(initiationURI)).pathname

      const initiationResponse = await request(app)
        .post(initiationURIPath)
      expect(initiationResponse.header["content-type"]).to.have.string("json");
      expect(initiationResponse.status).to.eql(200);
      expect(initiationResponse.body)

      const vpr = initiationResponse.body

      // Step 3. mimics what the wallet does once it's got the VPR
      const challenge = vpr.verifiablePresentationRequest.challenge // the challenge that the exchange service generated
      const continuationURI = vpr.verifiablePresentationRequest.interact.service.find(service => service.type === 'UnmediatedPresentationService2021').serviceEndpoint
      // strip out the host because we are using supertest
      const continuationURIPath = (new URL(continuationURI)).pathname
      const randomId = `did:ex:${crypto.randomUUID()}`
      const didAuth = await getSignedDIDAuth(randomId, challenge)

      const continuationResponse = await request(app)
        .post(continuationURIPath)
        .send(didAuth)

      expect(continuationResponse.header["content-type"]).to.have.string("json");
      expect(continuationResponse.status).to.eql(200);
      expect(continuationResponse.body)

      const signedVC = continuationResponse.body

      expect(signedVC.proof).to.exist
      // uncomment this if you are using this test to run through
      // an un-nocked scenario where you want to confirm the signing-service
      // has used the random DID supplied in the DIDAuth
      //expect(signedVC.credentialSubject.id).to.equal(randomId)

    })
  })


  describe('POST /instance/:instanceId/credentials/status', () => {
    before(async () => {
      resetConfig()
      process.env.ENABLE_STATUS_SERVICE = true
      
    });
  
    after(async () => {
      resetConfig()
      process.env.ENABLE_STATUS_SERVICE = false
    });

    it('returns 400 if no body', done => {
      request(app)
        .post(`/instance/${unprotectedTenantName}/credentials/status`)
        .expect('Content-Type', /json/)
        .expect(400, done)
    })

    it('returns 401 if tenant token is missing from auth header', done => {
      request(app)
        .post(`/instance/${protectedTenantName}/credentials/status`)
        .send(statusUpdateBody)
        .expect('Content-Type', /json/)
        .expect(401, done)
    })



    it('returns 403 if token is not valid', done => {
      request(app)
        .post(`/instance/${protectedTenantName}/credentials/status`)
        .set('Authorization', 'Bearer ThisIsABadToken')
        .send(statusUpdateBody)
        .expect('Content-Type', /json/)
        .expect(403, done)
    })

    it('returns 401 if token is not marked as Bearer', done => {
      request(app)
        .post(`/instance/${protectedTenantName}/credentials/status`)
        .set('Authorization', `${protectedTenantToken}`)
        .send(statusUpdateBody)
        .expect('Content-Type', /json/)
        .expect(401, done)
    })

    it('returns 404 if no seed for tenant name', done => {
      request(app)
        .post('/instance/wrongTenantName/credentials/status')
        .set('Authorization', `${protectedTenantToken}`)
        .send(statusUpdateBody)
        .expect(404, done)
        .expect('Content-Type', /json/)
    })

    it('returns 403 when trying to use token for a different tenant', done => {
      request(app)
        .post(`/instance/${protectedTenantName}/credentials/status`)
        .set('Authorization', `Bearer ${testTenantToken2}`)
        .send(statusUpdateBody)
        .expect('Content-Type', /json/)
        .expect(403, done)
    }) 


    it('update unprotected status when token not set for tenant in config', done => {
      unprotectedStatusUpdateNock()
      request(app)
        .post(`/instance/${unprotectedTenantName}/credentials/status`)
        .send(statusUpdateBody)
        .expect('Content-Type', /json/)
        .expect(200, done)
    })
 
    it('returns 404 for unknown cred id', async () => {
      unknownStatusIdNock()
      const statusUpdateBodyWithUnknownId = JSON.parse(JSON.stringify(statusUpdateBody))
      statusUpdateBodyWithUnknownId.credentialId = 'kj09ij'
      const response = await request(app)
        .post(`/instance/${protectedTenantName}/credentials/status`)
        .set('Authorization', `Bearer ${protectedTenantToken}`)
        .send(statusUpdateBodyWithUnknownId)

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.equal(404)
    })
  }) 
    
  describe('GET /status/:statusCredentialId', () => {
    before(async () => {
      resetConfig()
      process.env.ENABLE_STATUS_SERVICE = true
      
    });
  
    after(async () => {
      resetConfig()
      process.env.ENABLE_STATUS_SERVICE = false
    });

    it('returns 404 for unknown status credential id', async () => {
      unknownStatusListNock()
      const response = await request(app)
        .get('/status/9898u')
      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.equal(404)
    })


    it('returns credential status list from status service', async () => {
      statusListNock()
      const response = await request(app)
        .get('/status/slAwJe6GGR6mBojlGW5U')
      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.equal(200)
      const returnedList = JSON.parse(JSON.stringify(response.body))
      // this proof value comes from the nock:
      expect(returnedList.proof.proofValue).to.equal('z4y3GawinQg1aCqbYqZM8dmDpbmtFa3kE6tFefdXvLi5iby25dvmVwLNZrfcFPyhpshrhCWB76pdSZchVve3K1Znr')
    })
  })

  describe('/did-web-generator', () => {
    it('returns a new did:web', async () => {
      didWebGeneratorNock()
      await request(app)
        .post(`/did-web-generator`)
        .send({
          url: 'https://raw.githubusercontent.com/jchartrand/didWebTest/main'
        })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.seed).to.exist
          expect(res.body.didDocument.id).to.eql(
            'did:web:raw.githubusercontent.com:jchartrand:didWebTest:main'
          )
          expect(res.body.did).to.eql(
            'did:web:raw.githubusercontent.com:jchartrand:didWebTest:main'
          )
        })
        .expect(200)
    })
  })

  describe('/did-key-generator', () => {
    it('returns a new did:key', async () => {
      didKeyGeneratorNock()
      await request(app)
        .get(`/did-key-generator`)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.seed).to.exist
          expect(res.body.didDocument.id).to.contain('did:key')
          expect(res.body.did).to.contain('did:key')
        })
        .expect(200)
    })
  })

})