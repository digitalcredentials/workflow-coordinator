import express from 'express';
import cors from 'cors';
import axios from 'axios';
import accessLogger from './middleware/accessLogger.js';
import errorHandler from './middleware/errorHandler.js';
import errorLogger from './middleware/errorLogger.js';
import invalidPathHandler from './middleware/invalidPathHandler.js';
import verifyAuthHeader from './verifyAuthHeader.js'
import {getConfig} from './config.js'
import testVC from './testVC.js';
import {getSignedDIDAuth, verifyDIDAuth} from './didAuth.js';

async function callService(endpoint, body) {
        const { data } = await axios.post(endpoint, body);
        return data  
}

export async function build(opts = {}) {

    const {enableStatusService, statusServiceEndpoint, signingServiceEndpoint, transactionServiceEndpoint, exchangeHost} = getConfig();
    var app = express();
    // Add the middleware to write access logs
    app.use(accessLogger());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cors())

    app.get('/', async function (req, res, next) {
        if (enableStatusService) {
            try {
                await axios.get(`http://${statusServiceEndpoint}/`)
            } catch (e) {
            next({   
                    message: 'status service is NOT running.', 
                    error: e,
                    code: 500
                })
            }
        }
        try {
            await axios.get(`http://${signingServiceEndpoint}/`)  
        } catch (e) {
            next({   
                    message: 'signing service is NOT running.', 
                    error: e,
                    code: 500
                })
            }

        const message = enableStatusService ? 
            "issuer-coordinator, status-service, and signing-service all ok."
            :
            "issuer issuer-coordinator and signing-service both ok. status-service is disabled."

        res.status(200).send({ message })
      
    });

    /*
    A test that mocks both the wallet part of the interaction, and the 
    'issuer coordinator app' (i.e, the university specific code that uses the
    exchange coordinator), so that the flow can more easily be
    tested, without needing to redirect into an actual running wallet.
    NOTE: THIS TESTS WITHOUT THE INTERMEIDATE VPR step
    */
    app.get('/exchange-test-direct', async (req, res, next) => {

        // Step 1. Mimics what the school/uni code would do, which is to setup the 
        // exchange by passing in a VC that is pre-populated with student data.
        // The exchange endpoint stores the data and returns a deeplink (with challenge)
        // to which the student can be redirected, and which will then open the wallet
  
        const data = {vc: testVC, tenantName: "default"}
        const walletQuery = await callService(`http://localhost:4005/exchange/setup`, data)
        const {url} = walletQuery.find(q => q.type === 'directDeepLink')

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
        const challenge = parsedDeepLink.searchParams.get('challenge'); // the challenge that the exchange service generated 
        const didAuth = await getSignedDIDAuth('did:ex:223234', challenge)
        const signedVC = await callService(requestURI, didAuth)
        return res.json(signedVC)

    });

    /*
    A test that mocks both the wallet part of the interaction, and the 
    'issuer coordinator app' (i.e, the university specific code that uses the
    exchange coordinator), so that the flow can more easily be
    tested, without needing to redirect into an actual running wallet.
    NOTE: this tests with the intermediate VPR step
   
    */
    app.get('/exchange-test-vpr', async (req, res, next) => {

        try { 
        // Step 1. mimics what the school/uni code would do, which is to setup the exchange by passing in a VC that is pre-populated with student data.
        const data = {vc: testVC, tenantName: "default"}
        const walletQuery = await callService(`http://localhost:4005/exchange/setup`, data)
      
        // The exchange endpoint stores the data and returns a deeplink (with challenge)
        // to which the student can be redirected, and which will then open the wallet
        const {url} = walletQuery.find(q => q.type === 'vprDeepLink')

        // Step 2. mimics what the wallet would do when opened by deeplink
        // which is to parse the deeplink and call the exchange initiation endpoint
        const parsedDeepLink = new URL(url)
        const inititationURI = parsedDeepLink.searchParams.get('vc_request_url'); 
         const response = await axios.post(inititationURI);
         const vpr = response.data

        // Step 3. mimics what the wallet does once it's got the VPR
        const challenge = vpr.verifiablePresentationRequest.challenge // the challenge that the exchange service generated
        const continutationURI = vpr.verifiablePresentationRequest.interact.service.find(service => service.type === 'UnmediatedPresentationService2021').serviceEndpoint
        const didAuth = await getSignedDIDAuth('did:ex:223234', challenge)
        
        const signedVC = await callService(continutationURI, didAuth)
        return res.json(signedVC)
        } catch (e) {
            console.log(e)
        }

    });

    /*
    A test that mocks the 'issuer coordinator app', i.e, the client code
    that a university would write to invoke the exchange-coordinator. this
    should be called from a web browser on a phone (or emulator) 
    because it will redirect to the Learner Credential Wallet running on the
    phone.
    */
    app.get('/lcw-demo', async (req, res, next) => {
        // 1. post the test vc to the /setup endpoint
        // 2. redirect to the deeplink that comes back
        // The rest should take care of itself
    })

 
    /**
     * This would typically be the first step in an
     * exchange. A call would be made to this endpoint, passing
     * in the data for the credential (or the populated, but unsigned VC).
     * This setup then returns a deeplink (TODO: later also a chapi request)
     * that the end user can be redirected to, and which will open
     * the wallet on their phone, passing the wallet a link with
     * which to then initiate the exchange.
     * Note that by setting 'flow=direct' on the object posted
     *  to this endpoint, we can tell the exchanger to skip the 
     * inititation step and give the wallet the endpoint to which
     * to send the DIDAuth. This is for backward compatability.
     */
    app.post("/exchange/setup",
        async (req, res, next) => {
            try {
                //const tenantName = req.params.tenantName //the issuer instance/tenant with which to sign
                const authHeader = req.headers.authorization
                const exchangeData = req.body;
                exchangeData.exchangeHost = exchangeHost

                await verifyAuthHeader(authHeader, exchangeData.tenantName)
                if (!exchangeData || !Object.keys(exchangeData).length) throw {code:400, message:'You must provide data for the exchange.'}
                const walletQuery = await callService(`http://${transactionServiceEndpoint}/exchange`, exchangeData)
            
                return res.json(walletQuery)

            } catch (error) {
                console.log(error)
                // catch async errors and forward error handling
                // middleware
               next(error)
            }
        })

        /**
         * This is typically the second step in an exchange
         * where the wallet has been opened and now calls
         * this endpoint to initiate the exchange. This endpoint
         * returns a Verifiable Presentation Request (VPR) 
         * that asks the wallet to supply a DIDAuth.
         * Note that this step can be skipped by setting
         * flow=direct in the object we pass in to the setup endpoint.
         */
        app.post("/exchange/:exchangeId",
        async (req, res, next) => {
            try {
                const exchangeId = req.params.exchangeId
                const vpr = await callService(`http://${transactionServiceEndpoint}/exchange/${exchangeId}/`)
                return res.json(vpr)

            } catch (error) {
                // catch async errors and forward error handling
                // middleware
                console.log(error)
                next(error)
            }
        })

        /**
         * This is typically the third and final step in the
         * exchange. The wallet calls this endpoint, passing
         * in a didAuth which we give to the transaction
         * manager to verify and then to return the data (or VC) which
         * we use to construct the VC (unless already provided)fand pass to the
         * the status service and signing service before returning
         * to the wallet.
         */
    app.post("/exchange/:exchangeId/:transactionId",
        async (req, res, next) => {
            try {
                const exchangeId = req.params.exchangeId
                const transactionId = req.params.transactionId
                const body = req.body;
                if (!body || !Object.keys(body).length) throw {code:400, message:'A didAuth must be provided in the body'}
                // make a deep copy of the didAuth because something seemed to be
                // going wrong with the streams
                const didAuth = JSON.parse(JSON.stringify(body))
                const transactionEndpoint = `http://${transactionServiceEndpoint}/exchange/${exchangeId}/${transactionId}`
                const response = await axios.post(transactionEndpoint, didAuth);
                const { data } = response
                const {tenantName, vc: unSignedVC} = data
                unSignedVC.credentialSubject.id = didAuth.holder
                
                // add credential status if enabled
                const vcReadyToSign = enableStatusService ?
                    await callService(`http://${statusServiceEndpoint}/credentials/status/allocate`, unSignedVC)
                    :
                    unSignedVC
                
                // sign the credential
                const signedVC = await callService(`http://${signingServiceEndpoint}/instance/${tenantName}/credentials/sign`, vcReadyToSign)
                return res.json(signedVC)

            } catch (error) {
                // catch async errors and forward error handling
                // middleware
                console.log(error)
                next(error)
            }
        })

    // updates the status
    // the body will look like:  {credentialId: '23kdr', credentialStatus: [{type: 'StatusList2021Credential', status: 'revoked'}]}
    app.post("/instance/:tenantName/credentials/status",
        async (req, res, next) => {
            if (!enableStatusService) return res.status(405).send("The status service has not been enabled.")  
            try {
                await verifyAccess(req.headers.authorization, req.params.tenantName)
                const updateResult = await callService(`http://${statusServiceEndpoint}/instance/${tenantName}/credentials/sign`, vcWithStatus)
                return res.json(updateResult)
            } catch (error) {
                // have to catch and forward async errors to middleware:
                next(error)
            }
        })

        app.get('/seedgen', async (req, res, next) => {
            const response = await axios.get(`http://${signingServiceEndpoint}/seedgen`)
            return res.json(response.data)  
        });

    // Attach the error handling middleware calls, in order they should run
    app.use(errorLogger)
    app.use(errorHandler)
    app.use(invalidPathHandler)

    return app;

}
