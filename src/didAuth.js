import {signPresentation, createPresentation} from '@digitalbazaar/vc';
import {Ed25519VerificationKey2020} from '@digitalbazaar/ed25519-verification-key-2020';
import {Ed25519Signature2020} from '@digitalbazaar/ed25519-signature-2020';

import { securityLoader } from '@digitalcredentials/security-document-loader'

const documentLoader = securityLoader().build()

const key = await Ed25519VerificationKey2020.generate(
    {
        seed: new Uint8Array ([
            217,  87, 166,  30,  75, 106, 132,  55,
             32, 120, 171,  23, 116,  73, 254,  74,
            230,  16, 127,  91,   2, 252, 224,  96,
            184, 172, 245, 157,  58, 217,  91, 240
          ]), 
        controller: "did:key:z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP"
    }
)
const suite = new Ed25519Signature2020({key});
 
export const getSignedDIDAuth = async (holder = 'did:ex:12345', challenge) => {
    const presentation = createPresentation({holder});
    return await signPresentation({
        presentation, suite, challenge, documentLoader
    });
}

