let server = "https://api.teamhangloosegetsmarried.com/api"

// Setup for local dev
if(!window.location.hostname){
    server = "http://localhost:8080/api"
}

function handleError(errorMsg){
    console.log(errorMsg);
    let errorHandler = document.getElementById('errorMsg');
    showElement(errorHandler);
    errorHandler.innerHTML = errorMsg;
}
function hideError(){
    hideElement(document.getElementById('errorMsg'));
}

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
    hideError();

    // Show our new page
    showElement(document.getElementById('search'));
    let search = document.getElementById('searchForm');
    search.addEventListener('submit', requestRSVP);
    document.getElementById('searchName').focus();
}

function fillOutGuestSelection(invitationData){
    hideSearch();
    hideConfirmation();
    hideError();

    // Show our new page
    showElement(document.getElementById('guestselection'));

    // Global data, used later
    G_guestDataUiElements = {members:[]};
    // End global data

    // Create form from data
    let guestList = document.getElementById('guestList');
    let clonableCheckbox = document.getElementById('guestCheckbox');
    let plusOneForm = document.getElementById('plusOne');

    let startedCloning = false;
    function setupInput(elem, name, value){
        let label = elem.getElementsByTagName('label')[0];
        let checkbox = label.getElementsByTagName('input')[0];
        checkbox.checked = value;
        checkbox.name = name;
        checkbox.focus();
        // Set the label
        label.lastChild.textContent = name;
        G_guestDataUiElements.members.push(checkbox);
    }
    let names = Object.getOwnPropertyNames(invitationData.members).sort((a, b) => {
        if(a < b) return -1;
        if(a > b) return 1;
        return 0;
    });
    for(let guest of names){
        // Set wither we are checked or not
        if(!startedCloning){
            setupInput(clonableCheckbox, guest, invitationData.members[guest]);
            startedCloning = true;
        }else{
            let newGuest = clonableCheckbox.cloneNode(true);
            setupInput(newGuest, guest, invitationData.members[guest]);
            guestList.appendChild(newGuest);
        }
    }
    // Hide plus one option if needed
    if(invitationData.hasPlusOne){
        showElement(plusOneForm);
        // We haven't set our plus one name yet
        if(!invitationData.hasOwnProperty('plusOneName')){
            invitationData.plusOneName = '';
        }
        let plusOneName = document.getElementById('plusOneName');
        plusOneName.value = invitationData.plusOneName;
        G_guestDataUiElements.plusOneName = plusOneName;
    }else{
        hideElement(plusOneForm);
    }
    document.getElementById('guestForm').addEventListener('submit', requestConfirmation);
}

function setGuestsName(elem, name){
    let str = elem.innerHTML;
    elem.innerHTML = str.replace('{{name}}', name);
}

function fillOutConfirmation(confirmationData){
    hideSearch();
    hideGuestSelection();
    hideError();

    // Show our new page
    showElement(document.getElementById('confirmation'));
    let yes = document.getElementById('confirmationyes');
    let no = document.getElementById('confirmationno');
    let thanks = document.getElementById('confirmationthanks');

    // Set our thanks
    setGuestsName(thanks, confirmationData.name);
    // Select which option to display
    if(confirmationData.coming){
        showElement(yes);
        hideElement(no);
    }else{
        showElement(no);
        hideElement(yes);
    }
}

function requestRSVP(e){
    e.preventDefault(); // Don't actually submit


    // Global data, used later
    G_rsvpname = document.getElementById('searchName').value;
    G_pin = document.getElementById('searchZipcode').value;
    // End global data

    // Only bother if we have something good
    if(G_rsvpname && G_pin){
        let url = new URL(server + '/rsvp');
        // Get our parameters
        url.searchParams.append('rsvpname', G_rsvpname);
        url.searchParams.append('pin', G_pin);

        let params = {
            mode: 'cors'
        };
        fetch(url, params).then((res) => {
            // Handle any error codes
            if(!res.ok){
                res.text().then(handleError);
            }else{
                res.json().then(fillOutGuestSelection);
            }
        }).catch((err) => {
            handleError(err);
        });
    }
}

function requestConfirmation(e){
    e.preventDefault(); // Don't actually submit
    let url = new URL(server + '/rsvp');
    // Get our parameters
    let formData = {
        pin: G_pin,
        rsvpname: G_rsvpname,
        members: {}
    };
    for(let guestUiElem of G_guestDataUiElements.members){
        formData.members[guestUiElem.name] = guestUiElem.checked;
    }
    if(G_guestDataUiElements.hasOwnProperty('plusOneName')){
        formData.plusOneName = G_guestDataUiElements.plusOneName.value;
    }

    let params = {
        method: 'PUT',
        mode: 'cors',
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        body: JSON.stringify(formData)
    };

    fetch(url, params).then((res) => {
        // Handle any error codes
        if(!res.ok){
            res.text().then(handleError);
        }else{
            res.json().then(fillOutConfirmation);
        }
    }).catch((err) => {
        handleError(err);
    });
}

// Setup our page
fillOutSearchForm();
