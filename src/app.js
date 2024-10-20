import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https'
import accessLogger from './middleware/accessLogger.js';
import errorHandler from './middleware/errorHandler.js';
import errorLogger from './middleware/errorLogger.js';
import invalidPathHandler from './middleware/invalidPathHandler.js';
import verifyAuthHeader from './verifyAuthHeader.js'
import { getConfig } from './config.js'
import testVC from './testVC.js';
import CoordinatorException from './CoordinatorException.js';

async function callService(endpoint, body) {

    // At request level
    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    const { data } = await axios.post(endpoint, body, { httpsAgent: agent });
    return data
}

export async function build(opts = {}) {

    const { enableStatusService, statusService, signingService, transactionService, exchangeHost } = getConfig();
    var app = express();
    // Add the middleware to write access logs
    app.use(accessLogger());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cors())

    app.get('/', async function (req, res, next) {
        if (enableStatusService) {
            try {
                await axios.get(`http://${statusService}/`)
            } catch (e) {
                next({
                    message: 'status service is NOT running.',
                    error: e,
                    code: 500
                })
            }
        }
        try {
            await axios.get(`http://${signingService}/`)
        } catch (e) {
            next({
                message: 'signing service is NOT running.',
                error: e,
                code: 500
            })
        }
        try {
            await axios.get(`http://${transactionService}/`)
        } catch (e) {
            next({
                message: 'transaction service is NOT running.',
                error: e,
                code: 500
            })
        }
        const message = enableStatusService ?
            'workflow-coordinator, status-service, transaction-service, and signing-service all ok.' :
            'workflow-coordinator, transaction-service, and signing-service all ok. status-service is disabled.'

        res.status(200).send({ message })
    });

    /*
    A test that mocks the 'issuer coordinator app', i.e, the client code
    that a university would write to invoke the workflow-coordinator. this
    should be called from a web browser on a phone (or emulator) 
    because it will redirect to the Learner Credential Wallet running on the
    phone.
    */
    app.get('/demo', async (req, res, next) => {
        const retrievalId = 'ohmy'
        // 1. post the test vc to the /setup endpoint
        const data = {tenantName: 'test', data: [{ vc: testVC, retrievalId: 'ohmy' }]}
        const walletQuerys = await callService(`${exchangeHost}/exchange/setup`, data)
        // The exchange endpoint stores the data and returns a deeplink (with challenge)
        // to which the student can be redirected, and which will then open the wallet
        // NOTE: the setup endpoint accepts an array of credentials, where each
        // credential is identified by a 'retrievalId'.
        // In this case we've only posted one credential, but we still pull it
        // out by the retrievalId (rather than [0]), just for fun.
        const walletQuery = walletQuerys.find(q => q.retrievalId === 'ohmy')
        const url = walletQuery.directDeepLink

        // 2. redirect to the deeplink
        // The rest should take care of itself
        res.redirect(url)
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
     * initiation step and give the wallet the endpoint to which
     * to send the DIDAuth. This is for backward compatability.
     */
    app.post('/exchange/setup',
        async (req, res, next) => {
            try {
                const exchangeData = req.body;
                // TODO: CHECK THE INCOMING DATA FOR CORRECTNESS HERE
                if (!exchangeData || !Object.keys(exchangeData).length) throw new CoordinatorException(400, 'You must provide data for the exchange. Check the README for details.') 
                exchangeData.exchangeHost = exchangeHost

                await verifyAuthHeader(req.headers.authorization, exchangeData.tenantName)

                const walletQuerys = await callService(`http://${transactionService}/exchange`, exchangeData)

                return res.json(walletQuerys)
            } catch (error) {
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
    app.post('/exchange/:exchangeId',
        async (req, res, next) => {
            try {
                const exchangeId = req.params.exchangeId
                const vpr = await callService(`http://${transactionService}/exchange/${exchangeId}/`)
                return res.json(vpr)

            } catch (error) {
                // catch async errors and forward error handling
                // middleware
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
    app.post('/exchange/:exchangeId/:transactionId',
        async (req, res, next) => {
            try {
                const exchangeId = req.params.exchangeId
                const transactionId = req.params.transactionId
                const body = req.body;
                if (!body || !Object.keys(body).length) throw new CoordinatorException(400, 'A didAuth must be provided in the body.') 
                // make a deep copy of the didAuth because something seemed to be
                // going wrong with the streams
                const didAuth = JSON.parse(JSON.stringify(body))
                const transactionEndpoint = `http://${transactionService}/exchange/${exchangeId}/${transactionId}`
                const response = await axios.post(transactionEndpoint, didAuth);
                const { data } = response
                const { tenantName, vc: unSignedVC } = data
                unSignedVC.credentialSubject.id = didAuth.holder

                // add credential status if enabled
                const vcReadyToSign = enableStatusService ?
                    await callService(`http://${statusService}/credentials/status/allocate`, unSignedVC)
                    :
                    unSignedVC
                // sign the credential
                const signedVC = await callService(`http://${signingService}/instance/${tenantName.toLowerCase()}/credentials/sign`, vcReadyToSign)
                return res.json(signedVC)

            } catch (error) {
                // catch async errors and forward error handling
                // middleware
                next(error)
            }
        })

    // updates the status
    // the body will look like:  {credentialId: '23kdr', credentialStatus: [{type: 'BitstringStatusListCredential', status: 'revoked'}]}
    app.post('/instance/:tenantName/credentials/status',
        async (req, res, next) => {
            if (!getConfig().enableStatusService) return res.status(405).send('The status service has not been enabled.')
            try {
                await verifyAuthHeader(req.headers.authorization, req.params.tenantName)
                const statusUpdate = req.body
                  // NOTE: we throw the error here which will then be caught by middleware errorhandler
                  if (!statusUpdate || !Object.keys(statusUpdate).length) throw new CoordinatorException(400, 'A status update must be provided in the body.')
                    const updateResult = await callService(`http://${statusService}/credentials/status`, statusUpdate)
                    return res.json(updateResult)
            } catch (error) {
                if (error.response?.status === 404) {
                    next({ code: 404, message: 'Not found.' })
                  }
                  // otherwise, forward the error to middleware:
                  next(error)
            }
        })

        app.get('/status/:statusCredentialId', async function (req, res, next) {
            if (!getConfig().enableStatusService) next({ code: 405, message: 'The status service has not been enabled.' })
            const statusCredentialId = req.params.statusCredentialId
            try {
              const { data: statusCredential } = await axios.get(`http://${statusService}/${statusCredentialId}`)
              return res.status(200).json(statusCredential)
            } catch (error) {
              if (error.response.status === 404) {
                next({ code: 404, message: 'No status credential found for that id.' })
              } else {
                next(error)
              }
            }
          })


    app.get('/seedgen', async (req, res, next) => {
        const response = await axios.get(`http://${signingService}/seedgen`)
        return res.json(response.data)
    });

    app.get('/did-key-generator', async (req, res, next) => {
        const response = await axios.get(`http://${signingService}/did-key-generator`)
        return res.json(response.data)
      })
    
      app.post('/did-web-generator', async (req, res, next) => {
        const body = req.body
        const response = await axios.post(`http://${signingService}/did-web-generator`, body)
        return res.json(response.data)
      })

    // Attach the error handling middleware calls, in order they should run
    app.use(errorLogger)
    app.use(errorHandler)
    app.use(invalidPathHandler)

    return app;

}
