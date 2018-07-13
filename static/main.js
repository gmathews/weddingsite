const server = "http://localhost:8080"

function hideSearch(){
    let item = document.getElementById('search');
    item.style.display = 'none';
}

function hideGuestSelection(){
    let item = document.getElementById('guestselection');
    item.style.display = 'none';
}

function hideConfirmation(){
    let item = document.getElementById('confirmation');
    item.style.display = 'none';
}

function fillOutSearchForm(){
    hideGuestSelection();
    hideConfirmation();

    // Show our new page
    let item = document.getElementById('search');
    item.style.display = 'block';
}

function fillOutGuestSelection(invitationData){
    hideSearch();
    hideConfirmation();

    // Show our new page
    let item = document.getElementById('guestselection');
    item.style.display = 'block';

    // TODO: display guestselection div and populate selection field
    let rsvpData = document.getElementById('rsvpData');
    rsvpData.innerHTML = JSON.stringify(invitationData);
}

function fillOutConfirmation(confirmationData){
    hideSearch();
    hideGuestSelection();

    // Show our new page
    let item = document.getElementById('confirmation');
    item.style.display = 'block';
}

function requestRSVP(){
    let url = new URL(server + '/rsvp');
    let params = {rsvpname: 'George Mathews', pin: '90066'};
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    fetch(url, {mode: 'cors'})
    .then((res) => {
        // Handle any error codes
        if(!res.ok){
            // TODO: Better error handling
            throw new Error(res.statusText);
        }
        return res.json();
    })
    .then((data) => {
        console.log('Search', JSON.stringify(data));
        fillOutGuestSelection(data);
    })
    .catch((err) => {
        // TODO: error handling
        console.log(err);
    });
}

function requestConfirmation(){
    let url = new URL(server + '/rsvp');
    let updateData = {
        rsvpname: 'George Mathews',
        pin: '90066',
        "members": {
            'George Mathews':false,
            'Kris Alvarado':false
        }
    };

    fetch(url, {mode: 'cors', method: 'PUT', headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
        },body: JSON.stringify(updateData)})
    .then((res) => {
        // Handle any error codes
        if(!res.ok){
            // TODO: Better error handling
            throw new Error(res.statusText);
        }
        return res.json();
    })
    .then((data) => {
        console.log('Confirmation', JSON.stringify(data));
        fillOutConfirmation(data);
    })
    .catch((err) => {
        // TODO: error handling
        console.log(err);
    });
}

// Setup our page
fillOutSearchForm();
