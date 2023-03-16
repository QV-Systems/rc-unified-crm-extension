function getContactAdditionalInfo(contactRes) {
    if (!contactRes.data.successful || !contactRes.data.contact.links || contactRes.data.contact.links.length === 0) {
        return [];
    }
    const additionalInfo = [];
    const distinctLabels = contactRes.data.contact.links.map(link => link.label).filter((x, i, a) => a.indexOf(x) == i);
    for (const label of distinctLabels) {
        const links = contactRes.data.contact.links.filter(l => l.label === label);
        additionalInfo.push({
            label,
            value: links.map(l => { return { id: l.id, title: l.name } })
        })
    }
    return additionalInfo;
}

function getIncomingCallContactInfo(contactInfo) {
    const companyName = contactInfo.links.find(l => l.label === 'Organisation')?.name;
    return {
        id: contactInfo.id,
        company: companyName,
        title: contactInfo.title
    }
}

function openContactPage(hostname, id) {
    window.open(`https://${hostname}/list/Contact/?blade=/details/contact/${id}`);
}

exports.getContactAdditionalInfo = getContactAdditionalInfo;
exports.getIncomingCallContactInfo = getIncomingCallContactInfo;
exports.openContactPage = openContactPage;