import axios from 'axios';
import config from '../config.json';
import { showNotification } from '../lib/util';

async function submitPlatformSelection(platform) {
    await chrome.storage.local.set({
        ['platform-info']: platform
    })
}

// apiUrl only by Insightly
async function apiKeyLogin({ apiKey, apiUrl }) {
    try {
        const platformInfo = await chrome.storage.local.get('platform-info');
        const platformName = platformInfo['platform-info'].platformName;
        const { rcUserNumber } = await chrome.storage.local.get('rcUserNumber');
        const res = await axios.post(`${config.serverUrl}/apiKeyLogin?state=platform=${platformName}`, {
            apiKey,
            platform: platformName,
            rcUserNumber,
            additionalInfo: {
                apiUrl
            }
        });
        setAuth(true);
        await chrome.storage.local.set({
            ['rcUnifiedCrmExtJwt']: res.data
        });
    }
    catch (e) {
        console.log(e);
        showNotification({ level: 'warning', message: 'Failed to register api key.', ttl: 3000 });
    }
}

async function onAuthCallback(callbackUri) {
    const { rcUserNumber } = await chrome.storage.local.get('rcUserNumber');
    const platformInfo = await chrome.storage.local.get('platform-info');
    const hostname = platformInfo['platform-info'].hostname;
    const res = await axios.get(`${config.serverUrl}/oauth-callback?callbackUri=${callbackUri}&rcUserNumber=${rcUserNumber}&hostname=${hostname}`);
    setAuth(true);
    await chrome.storage.local.set({
        ['rcUnifiedCrmExtJwt']: res.data
    });
}

async function unAuthorize(rcUnifiedCrmExtJwt) {
    try {
        await axios.post(`${config.serverUrl}/unAuthorize?jwtToken=${rcUnifiedCrmExtJwt}`);
        await chrome.storage.local.remove('rcUnifiedCrmExtJwt');
        setAuth(false);
    }
    catch (e) {
        console.log(e);
    }
}

async function checkAuth() {
    const { rcUnifiedCrmExtJwt } = await chrome.storage.local.get('rcUnifiedCrmExtJwt');
    setAuth(!!rcUnifiedCrmExtJwt);
}

function setAuth(auth) {
    document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
        type: 'rc-adapter-update-authorization-status',
        authorized: auth
    });
}

exports.submitPlatformSelection = submitPlatformSelection;
exports.apiKeyLogin = apiKeyLogin;
exports.onAuthCallback = onAuthCallback;
exports.unAuthorize = unAuthorize;
exports.checkAuth = checkAuth;