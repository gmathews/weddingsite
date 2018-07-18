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
    document.getElementById('searchForm').addEventListener('submit', requestRSVP);
}

function fillOutGuestSelection(invitationData){
    console.log( 'guest data', invitationData);
    hideSearch();
    hideConfirmation();

    // Show our new page
    let item = document.getElementById('guestselection');
    item.style.display = 'block';

    // Create form from data
    let form = document.getElementById('guestForm');
    let clonableCheckbox = document.getElementById('guestCheckbox');
    let plusOneName = document.getElementById('plusOneName');

    let startedCloning = false;
    function setupInput(elem, name, value){
        elem.children[0].checked = value;
        elem.children[0].name = name;
        elem.children[1].innerText = name;
    }
    for(let guest in invitationData.members){
        // Set wither we are checked or not
        if(!startedCloning){
            setupInput(clonableCheckbox, guest, invitationData.members[guest]);
            startedCloning = true;
        }else{
            let newGuest = clonableCheckbox.cloneNode(true);
            setupInput(newGuest, guest, invitationData.members[guest]);
            form.insertBefore(newGuest, plusOneName);
        }
    }
    // Hide plus one option if needed
    if(invitationData.hasPlusOne){
        plusOneName.style.display = 'block';
    }else{
        plusOneName.style.display = 'none';
    }
    form.addEventListener('submit', requestConfirmation);
}

function fillOutConfirmation(confirmationData){
    console.log( 'confirmation data', confirmationData);
    hideSearch();
    hideGuestSelection();

    // Show our new page
    let item = document.getElementById('confirmation');
    item.style.display = 'block';
}

function requestRSVP(e){
    e.preventDefault(); // Don't actually submit
    let url = new URL(server + '/rsvp');
    // Get our parameters
    url.searchParams.append('rsvpname', document.getElementById('searchName').value);
    url.searchParams.append('pin', document.getElementById('searchZipcode').value);

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
        fillOutGuestSelection(data);
    })
    .catch((err) => {
        // TODO: error handling
        console.log(err);
    });
}

function requestConfirmation(e){
    e.preventDefault(); // Don't actually submit
    let url = new URL(server + '/rsvp');

    // TODO: Get our parameters
    let formData = {
    };

    fetch(url, {
        mode: 'cors',
        method: 'PUT',
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        body: JSON.stringify(formData)
    })
    .then((res) => {
        // Handle any error codes
        if(!res.ok){
            // TODO: Better error handling
            throw new Error(res.statusText);
        }
        return res.json();
    })
    .then((data) => {
        fillOutConfirmation(data);
    })
    .catch((err) => {
        // TODO: error handling
        console.log(err);
    });
}

// Setup our page
fillOutSearchForm();
