const server = "http://localhost:8080"

function hideSearch(){
    hideElement(document.getElementById('search'));
}

function hideGuestSelection(){
    hideElement(document.getElementById('guestselection'));
}

function hideConfirmation(){
    hideElement(document.getElementById('confirmation'));
}

function hideElement(elem){
    elem.style.display = 'none';
}

function showElement(elem){
    elem.style.display = 'block';
}

function fillOutSearchForm(){
    hideGuestSelection();
    hideConfirmation();

    // Show our new page
    showElement(document.getElementById('search'));
    document.getElementById('searchForm').addEventListener('submit', requestRSVP);
}

function fillOutGuestSelection(invitationData){
    guestDataUiElements = {members:[]};// Global
    hideSearch();
    hideConfirmation();

    // Show our new page
    showElement(document.getElementById('guestselection'));

    // Create form from data
    let form = document.getElementById('guestForm');
    let clonableCheckbox = document.getElementById('guestCheckbox');
    let plusOneName = document.getElementById('plusOneName');

    let startedCloning = false;
    function setupInput(elem, name, value){
        elem.children[0].checked = value;
        elem.children[0].name = name;
        elem.children[1].innerText = name;
        guestDataUiElements.members.push(elem.children[0]);
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
        showElement(plusOneName);
        guestDataUiElements.plusOneName = plusOneName;
    }else{
        hideElement(plusOneName);
    }
    form.addEventListener('submit', requestConfirmation);
}

function fillOutConfirmation(confirmationData){
    hideSearch();
    hideGuestSelection();

    // Show our new page
    showElement(document.getElementById('confirmation'));
    let yes = document.getElementById('confirmationyes');
    let no = document.getElementById('confirmationno');
    // Select which option to display
    if(confirmationData.coming){
        showElement(yes);
        hideElement(no);
        // = confirmationData.name;
    }else{
        showElement(no);
        hideElement(yes);
        // = confirmationData.name;
    }
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
    // Get our parameters
    let formData = {
        members: {}
    };
    for(let guestUiElem of guestDataUiElements.members){
        formData.members[guestUiElem.name] = guestUiElem.checked;
    }
    if(guestDataUiElements.hasOwnProperty('plusOneName')){
        formData.plusOneName = guestDataUiElements.plusOneName.value;
    }

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
