const express = require('express');
const bodyParser = require('body-parser')
const { UserModel } = require('./models/userModel');
const { CallLogModel } = require('./models/callLogModel');
const { MessageLogModel } = require('./models/messageLogModel');
const cors = require('cors')
const oauth = require('./lib/oauth');
const jwt = require('./lib/jwt');
const { addCallLog, addMessageLog, getCallLog } = require('./core/log');
const { getContact } = require('./core/contact');

async function initDB() {
    await UserModel.sync();
    await CallLogModel.sync();
    await MessageLogModel.sync();
}

initDB();

const app = express();
app.use(bodyParser.json())

app.use(cors({
    origin: ['chrome-extension://adlfdhlnnkokmmonfnapacebcldipebm'],
    methods: ['GET', 'POST']
}));

app.get('/is-alive', (req, res) => { res.send(`OK`); });
app.get('/oauth-callback', async function (req, res) {
    try {
        const platform = req.query.state.split('platform=')[1];
        if (!platform) {
            throw 'missing platform name';
        }
        const platformModule = require(`./platformModules/${platform}`);
        const oauthApp = oauth.getOAuthApp(platformModule.getOauthInfo());
        const { accessToken, refreshToken, expires } = await oauthApp.code.getToken(req.query.callbackUri);
        const userInfo = await platformModule.getUserInfo({ accessToken });
        await UserModel.create({
            id: userInfo.id,
            name: userInfo.name,
            companyId: userInfo.companyId,
            companyName: userInfo.companyName,
            companyDomain: userInfo.companyDomain,
            platform: platform,
            accessToken,
            refreshToken,
            tokenExpiry: expires,
            rcUserNumber: req.query.rcUserNumber
        });
        const jwtToken = jwt.generateJwt({
            id: userInfo.id,
            rcUserNumber: req.query.rcUserNumber,
            platform: platform
        });
        res.status(200).send(jwtToken);
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
})
app.post('/unAuthorize', async function (req, res) {
    try {
        const jwtToken = req.query.jwtToken;
        if (jwtToken) {
            const unAuthData = jwt.decodeJwt(jwtToken);
            const userToLogout = await UserModel.destroy({
                where: {
                    id: unAuthData.id
                }
            });
            if (userToLogout === 0) {
                res.status(400).send('unknown user');
            }
            res.status(200).send();
        }
        else {
            res.status(400).send('missing jwt token');
        }
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});
app.get('/contact', async function (req, res) {
    try {
        const jwtToken = req.query.jwtToken;
        if (jwtToken) {
            const { id: userId, platform } = jwt.decodeJwt(jwtToken);
            const { successful, message, contact } = await getContact({ platform, userId, phoneNumber: req.query.phoneNumber });
            res.status(200).send({ successful, message, contact });
        }
        else {
            res.status(400).send('missing jwt token');
        }
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});
app.get('/callLog', async function (req, res) {
    try {
        const jwtToken = req.query.jwtToken;
        if (jwtToken) {
            const { platform } = jwt.decodeJwt(jwtToken);
            const { successful, logId } = await getCallLog({ platform, sessionId: req.query.sessionId });
            res.status(200).send({ successful, logId });
        }
        else {
            res.status(400).send('missing jwt token');
        }
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});
app.post('/callLog', async function (req, res) {
    try {
        const jwtToken = req.query.jwtToken;
        if (jwtToken) {
            const { id: userId, platform } = jwt.decodeJwt(jwtToken);
            const { successful, message, logId } = await addCallLog({ platform, userId, incomingData: req.body });
            res.status(200).send({ successful, message, logId });
        }
        else {
            res.status(400).send('missing jwt token');
        }
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});
app.post('/messageLog', async function (req, res) {
    try {
        const jwtToken = req.query.jwtToken;
        if (jwtToken) {
            const { id: userId, platform } = jwt.decodeJwt(jwtToken);
            const { successful, message, logIds } = await addMessageLog({ platform, userId, incomingData: req.body });
            res.status(200).send({ successful, message, logIds });
        }
        else {
            res.status(400).send('missing jwt token');
        }
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});

exports.server = app;