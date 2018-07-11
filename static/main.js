const server = "http://localhost:8080"

function requestRSVP(){
    let url = new URL(server + '/rsvp');
    let params = {lastname: 'George Mathews', pin: '90066'};
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
        // TODO: display rsvp data
        let rsvpData = document.getElementById('rsvpData');
        rsvpData.innerHTML = data;
        console.log(JSON.stringify(data));

    })
    .catch((err) => {
        // TODO: error handling
        console.log(err);
    });
}
