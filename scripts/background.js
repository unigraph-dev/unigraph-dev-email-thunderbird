console.log("Hey!")

const dates = {
    "last-month": 1000*60*60*24*31,
    "last-day": 1000*60*60*24,
}

function connectToUnigraph(callback) {
    let conn = new WebSocket('ws://localhost:3001');
    conn.onclose = ((ev) => {connectToUnigraph()});
    conn.onopen = ((ev) => callback());
    window.unigraphConnection = conn;
}

async function getMessagesSince(when) {
    let cont = true;
    let lst = await browser.messages.query({fromDate: (new Date() - dates[when])})
    if (!lst.id) cont = false;
    let msgs = lst.messages;
    while(cont) {
        lst = await browser.messages.continueList(lst.id);
        if (!lst.id) cont = false;
        msgs.push(...lst.messages)
    }
    return msgs;
}

async function sendToUnigraph(msgs) {
    const ret = await Promise.all(msgs.map(async (el) => {
        return {
            read: el.read,
            message: await browser.messages.getRaw(el.id)
        }
    }));

    window.unigraphConnection.send(JSON.stringify({
        "type": "event",
        "event": "run_executable",
        "id": (new Date() - 1),
        "unigraph.id": "$/executable/add-email",
        "params": {"messages": ret}
    }))
}

connectToUnigraph(() => {
    getMessagesSince('last-month').then(sendToUnigraph);
    browser.messages.onNewMailReceived.addListener(function(folder, messageList) {
        sendToUnigraph(messageList.messages);
    })
})




