const axios = require('axios'); 
const moment = require('moment');
const { parsePhoneNumber } = require('awesome-phonenumber');

function formatTimestamp(timestamp) {
    const date = (timestamp.toString().length === 10) ? new Date(timestamp * 1000) : new Date(timestamp);
  
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if single digit
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    const smallYear = year % 1000;
  
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function convertPhoneNumber(phone) {
    if (phone.startsWith('+44')) {
      return '0' + phone.slice(3);
    }
    return phone;
}

function replaceFirst44With0(str) {
    const index = str.indexOf("44");
    
    if (index !== -1) {
      return str.slice(0, index) + "0" + str.slice(index + 2);
    }
    
    return str; 
}

async function findContactQVApiCall(hostname, phoneNumber, apiKey) {
    console.log(`GET https://${hostname}/qvine/quotevine/ringcentral/v1/find-contact/${phoneNumber}/`);
    const returnedContacts = await axios.get(`https://${hostname}/qvine/quotevine/ringcentral/v1/find-contact/${phoneNumber}/`, {
        headers: { 
            'api-key' : apiKey
        }
    }).then(response => response.data.items);
    return returnedContacts;
}

async function createTelephoneCall(hostname, apiKey, payload) {
    console.log(`POST https://${hostname}/qvine/quotevine/api/v2/telephone_calls/`);
    const response = await axios.post(`https://${hostname}/qvine/quotevine/api/v2/telephone_calls/`, payload, {
        headers: {
            'api-key': apiKey
        }
    }).then(response => response.data);
    return response;
}

async function getTelephoneCall(hostname, callLogId, apiKey) {
    console.log(`GET https://${hostname}/qvine/quotevine/api/v2/telephone_calls/${callLogId}/`);
    const response = await axios.get(`https://${hostname}/qvine/quotevine/api/v2/telephone_calls/${callLogId}/`, {
        headers: {
            'api-key': apiKey
        }
    }).then(response => response.data);
    return response;
}

async function updateTelephoneCall(hostname, callLogId, apiKey, payload) {
    console.log(`PUT https://${hostname}/qvine/quotevine/api/v2/telephone_calls/${callLogId}/`)
    console.log(payload)
    const response = await axios.put(`https://${hostname}/qvine/quotevine/api/v2/telephone_calls/${callLogId}/`, payload, {
        headers: {
            'api-key': apiKey
        },
    }).then(response => response.data);
    return response;
}

function getAuthType() {
    return 'apiKey'; 
}

function getBasicAuth({ apiKey }) {
    return Buffer.from(`${apiKey}`);
}

async function authenticateUser(url, apiKey, payload) {
    console.log(`https://${url}/qvine/quotevine/api/v2/system_user/authenticate`);
    const response = await axios.post(`https://${url}/qvine/quotevine/api/v2/system_user/authenticate`, payload, {
        headers: {
            'api-key': apiKey
        }
    }).then(response => response.data);
    return response;
}

async function getSystemUser(url, apiKey, userId) {
    console.log(`https://${url}/qvine/quotevine/ringcentral/v1/system-users/${userId}/`)
    const response = await axios.get(`https://${url}/qvine/quotevine/ringcentral/v1/system-users/${userId}/`, {
        headers: {
            'api-key': apiKey
        }
    });
    return response.data 
}

exports.getBasicAuth = getBasicAuth;

async function getUserInfo({ authHeader, additionalInfo }) {
    try {
        const apiKey = authHeader.slice(6);

        payload = {
            'email_address': additionalInfo.username,
            'password': additionalInfo.password
        }
        const userInfoResponse = await authenticateUser(additionalInfo.apiUrl, apiKey, payload);
        
        const userInfo = await getSystemUser(additionalInfo.apiUrl, apiKey, userInfoResponse.user.userid);

        const platformAdditionalInfo = {
            'companyId': userInfoResponse.clientid,
            'companyName': userInfo.companyName,
            'companyDomain': userInfo.companyDomain
        }

        return {
            successful: true,
            platformUserInfo: {
                id: String(userInfoResponse.user.userid),
                name: userInfoResponse.user.display_name,
                timezoneName: 'GMT',
                timezoneOffset: 0,
                platformAdditionalInfo: platformAdditionalInfo 
            },
            returnMessage: {
                messageType: 'success',
                message: 'Successfully connected to Accelerate.',
                ttl: 3000
            }
        };
    }
    catch (e) {
        console.log(e);
        return {
            successful: false,
            returnMessage: {
                messageType: 'warning',
                message: 'Failed to get user info.',
                ttl: 3000
            }
        }
    }
}

async function unAuthorize({ user }) {
    // -----------------------------------------------------------------
    // ---TODO.2: Implement token revocation if CRM platform requires---
    // -----------------------------------------------------------------

    // const revokeUrl = 'https://api.crm.com/oauth/unauthorize';
    // const revokeBody = {
    //     token: user.accessToken
    // }
    // const accessTokenRevokeRes = await axios.post(
    //     revokeUrl,
    //     revokeBody,
    //     {
    //         headers: { 'Authorization': `Basic ${getBasicAuth({ apiKey: user.accessToken })}` }
    //     });
    await user.destroy();
    return {
        returnMessage: {
            messageType: 'success',
            message: 'Successfully logged out from Accelerate account.',
            ttl: 3000
        }
    }

    //--------------------------------------------------------------
    //---CHECK.2: Open db.sqlite to check if user info is removed---
    //--------------------------------------------------------------
}

async function findContact({ user, authHeader, phoneNumber, overridingFormat, isExtension }) {

    phoneNumber = phoneNumber.replace(' ', '')

    const apexSession = await getSystemUser(user.hostname, user.accessToken, user.id);

    console.log(`phone number: ${phoneNumber}`)
    console.log(`is extension number? ${isExtension}`)

    const numberToQueryArray = [];

    if(isExtension)
    {
        numberToQueryArray.push(phoneNumber);
        
        if (phoneNumber.slice(0,2) == '44') {
            const alternativeFormatPhoneNumber = replaceFirst44With0(phoneNumber);
            numberToQueryArray.push(alternativeFormatPhoneNumber);
        }
    }
    else{
        numberToQueryArray.push(phoneNumber.replace('', '+'));
    }

    const matchedContactInfo = [];
    const foundContacts = [];
    
    for (var numberToQuery of numberToQueryArray) {
        try {
            console.log(numberToQuery)
            const personInfo = await findContactQVApiCall(user.hostname, numberToQuery, user.accessToken);
            if (personInfo.length > 0) {
                for (var result of personInfo) {
                    foundContacts.push({
                        id: result.relationship_id,
                        name: result.display_name,
                        type: `${user.id}`,
                        phone: numberToQuery,
                        additionalInfo: {
                            'mobileNumber': result.mobile_number,
                            'date_of_birth': result.date_of_birth,
                            'source': result.source,
                            'title_id': result.title_id? result.title_id : undefined
                        }
                    })
                }
            } 
        } catch (err) {
            console.log('Api call error');
            console.log(err);
        }
    }

    console.log(foundContacts);

    if (foundContacts.length == 1) {
        matchedContactInfo[0] = foundContacts[0];
        return {
            matchedContactInfo,
            returnMessage: {
                messageType: 'success',
                message: 'Contact found successfully.',
                ttl: 3000
            }
        };
    } else if (foundContacts.length > 1) {
        return {
            matchedContactInfo,
            returnMessage: {
                messageType: 'failed',
                message: 'Found multiple contacts.',
                ttl: 3000
            }
        };
    } else {
        return {
            matchedContactInfo,
            returnMessage: {
                messageType: 'failed',
                message: 'Cannot find contact.',
                ttl: 3000
            }
        };
    }
}

async function createCallLog({ user, contactInfo, authHeader, callLog, note, additionalSubmission }) {
    
    const startTime = formatTimestamp(new Date(callLog.startTime));
    const comment = `subject: ${callLog.customSubject}. note: ${note}`

    const payload = {
        call_date: startTime,
        direction: callLog.direction === 'Outbound' ? 'O':'I',
        source_number: callLog.from.phoneNumber,
        destination_number: callLog.to.phoneNumber,
        internal_flag: "N",
        comments: comment,
        recording_url: callLog.recording? callLog.recording.link : null,
        call_duration_seconds: callLog.duration,
        external_reference: callLog.id,
        user_id: user.id
    }

    const response = await createTelephoneCall(user.hostname, user.accessToken, payload);
    
    console.log(`with additional info... \n${JSON.stringify(additionalSubmission, null, 2)}`);

    console.log(response);

    const newCallLog = {
        id: response.telephone_call_id,
        subject: callLog.customSubject,
        note: note,
        contactName: contactInfo.name
    }
    const addLogRes = {
        data: {
            id: newCallLog.id
        }
    }

    return {
        logId: addLogRes.data.id,
        returnMessage: {
            message: 'Call log added.',
            messageType: 'success',
            ttl: 3000
        }
    };
}

async function getCallLog({ user, callLogId, authHeader }) {
    const hostname = user.hostname;
    const response = await getTelephoneCall(hostname, callLogId, user.accessToken);
    console.log(response)

    const subject =  response.comments.split(' note: ')[0].split('subject: ')[1]
    const note = response.comments.split(' note: ')[1]

    return {
        callLogInfo: {
            subject: subject,
            note: note
        },
        returnMessage: {
            message: 'Call log fetched.',
            messageType: 'success',
            ttl: 3000
        }
    }
}

async function updateCallLog({ user, existingCallLog, authHeader, recordingLink, subject, note }) {

    console.log(existingCallLog);
    const comment = `subject: ${subject}. note: ${note}`

    

    const current_state = await getTelephoneCall(user.hostname, existingCallLog.dataValues.thirdPartyLogId, user.accessToken);

    const payload = {
        direction: current_state.direction,
        internal_flag: current_state.internal_flag,
        comments: comment,
        external_reference: current_state.external_reference,
        call_date: current_state.call_date        
    };

    const response = await updateTelephoneCall(user.hostname, existingCallLog.dataValues.thirdPartyLogId, user.accessToken, payload);

    return {
        updatedNote: note,
        returnMessage: {
            message: 'Call log updated.',
            messageType: 'success',
            ttl: 3000
        }
    };
}

async function createMessageLog({ user, contactInfo, authHeader, message, additionalSubmission, recordingLink, faxDocLink }) {
    // ---------------------------------------
    // ---TODO.7: Implement message logging---
    // ---------------------------------------

    // const postBody = {
    //     data: {
    //         subject: `[SMS] ${message.direction} SMS - ${message.from.name ?? ''}(${message.from.phoneNumber}) to ${message.to[0].name ?? ''}(${message.to[0].phoneNumber})`,
    //         body: `${message.direction} SMS - ${message.direction == 'Inbound' ? `from ${message.from.name ?? ''}(${message.from.phoneNumber})` : `to ${message.to[0].name ?? ''}(${message.to[0].phoneNumber})`} \n${!!message.subject ? `[Message] ${message.subject}` : ''} ${!!recordingLink ? `\n[Recording link] ${recordingLink}` : ''}\n\n--- Created via RingCentral CRM Extension`,
    //         type: 'Message'
    //     }
    // }
    // const addLogRes = await axios.post(
    //     `https://api.crm.com/activity`,
    //     postBody,
    //     {
    //         headers: { 'Authorization': authHeader }
    //     });
    const messageType = !!recordingLink ? 'Voicemail' : (!!faxDocLink ? 'Fax' : 'SMS');
    console.log(`adding message log... \n\n${JSON.stringify(message, null, 2)}`);
    mockMessageLog = {
        id: 'testMessageLogId'
    }
    const addLogRes = {
        data: {
            id: mockMessageLog.id
        }
    }
    //-------------------------------------------------------------------------------------------------------------
    //---CHECK.7: For single message logging, open db.sqlite and CRM website to check if message logs are saved ---
    //-------------------------------------------------------------------------------------------------------------
    return {
        logId: addLogRes.data.id,
        returnMessage: {
            message: 'Message log added.',
            messageType: 'success',
            ttl: 3000
        }
    };
}

// Used to update existing message log so to group message in the same day together
async function updateMessageLog({ user, contactInfo, existingMessageLog, message, authHeader }) {
    // ---------------------------------------
    // ---TODO.8: Implement message logging---
    // ---------------------------------------

    // const existingLogId = existingMessageLog.thirdPartyLogId;
    // const getLogRes = await axios.get(
    //     `https://api.crm.com/activity/${existingLogId}`,
    //     {
    //         headers: { 'Authorization': authHeader }
    //     });
    // const originalNote = getLogRes.data.body;
    // const updateNote = orginalNote.replace();

    // const patchBody = {
    //     data: {
    //         body: updateNote,
    //     }
    // }
    // const updateLogRes = await axios.patch(
    //     `https://api.crm.com/activity`,
    //     patchBody,
    //     {
    //         headers: { 'Authorization': authHeader }
    //     });
    console.log(`update message log with... \n\n${JSON.stringify(message, null, 2)}`);

    //---------------------------------------------------------------------------------------------------------------------------------------------
    //---CHECK.8: For multiple messages or additional message during the day, open db.sqlite and CRM website to check if message logs are saved ---
    //---------------------------------------------------------------------------------------------------------------------------------------------
}

async function createContact({ user, authHeader, phoneNumber, newContactName, newContactType }) {
    // ----------------------------------------
    // ---TODO.9: Implement contact creation---
    // ----------------------------------------

    const postBody = {
        name: newContactName,
        type: newContactType,
        phone_numbers: [
            {
                name: "Work",
                number: phoneNumber,
                default_number: true
            }
        ]
    }
    // const contactInfoRes = await axios.post(
    //     `https://api.crm.com/contacts`,
    //     postBody,
    //     {
    //         headers: { 'Authorization': authHeader }
    //     }
    // );
    mockContact = {
        id: 'testContactId',
        name: newContactName,
        type: newContactType,
        phone: phoneNumber,
        additionalInfo: {
            associatedDeal: [
                {
                    const: 'csA351',
                    title: 'Christmas special A351'
                },
                {
                    const: 'eA22',
                    title: 'Easter A22'
                },
                {
                    const: 'aC92',
                    title: 'Anniversary C92'
                }
            ],
            address: ''
        }
    }

    const contactInfoRes = {
        data: {
            id: mockContact.id,
            name: mockContact.name
        }
    }

    //--------------------------------------------------------------------------------
    //---CHECK.9: In extension, try create a new contact against an unknown number ---
    //--------------------------------------------------------------------------------
    return {
        contactInfo: {
            id: contactInfoRes.id,
            name: contactInfoRes.name
        },
        returnMessage: {
            message: `New contact not created.`,
            messageType: 'warning',
            ttl: 3000
        }
    }
}


exports.getAuthType = getAuthType;
exports.getUserInfo = getUserInfo;
exports.createCallLog = createCallLog;
exports.updateCallLog = updateCallLog;
exports.getCallLog = getCallLog;
exports.createMessageLog = createMessageLog;
exports.updateMessageLog = updateMessageLog;
exports.findContact = findContact;
exports.createContact = createContact;
exports.unAuthorize = unAuthorize;
