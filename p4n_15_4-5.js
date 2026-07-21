
/**
Use as bookmarklet:

javascript:(function(){
  var s=document.createElement('script');
  s.src='https://bputo.github.io/p4n.js';
  document.body.appendChild(s);
})();
*/

(() => {

    const CONFIG = {
        enabled: true,

        radius: 200,

        minReviews: 15,
        minRating: 4.5
    };

    function decodeBase64Json(base64) {

        const binary = atob(base64);

        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

        const json = new TextDecoder().decode(bytes);

        return JSON.parse(json);
    }

    function encodeBase64Json(obj) {

        const json = JSON.stringify(obj);

        const bytes = new TextEncoder().encode(json);

        let binary = "";

        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary);
    }

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {

        let [resource, init] = args;

        let url;

        if (resource instanceof Request) {
            url = new URL(resource.url);
        } else {
            url = new URL(resource, location.origin);
        }

        //----------------------------------------------------
        // Modify request
        //----------------------------------------------------

        if (
            CONFIG.enabled &&
            url.pathname === "/api/places/around"
        ) {

            url.searchParams.set(
                "radius",
                CONFIG.radius.toString()
            );

            console.log("Modified radius:", url.toString());

            if (resource instanceof Request) {
                resource = new Request(url.toString(), resource);
            } else {
                resource = url.toString();
            }
        }

        const response = await originalFetch(resource, init);

        //----------------------------------------------------
        // Ignore other requests
        //----------------------------------------------------

        if (
            !CONFIG.enabled ||
            url.pathname !== "/api/places/around"
        ) {
            return response;
        }

        //----------------------------------------------------
        // Decode
        //----------------------------------------------------

        const encoded = await response.text();

        let places = decodeBase64Json(encoded);

        console.log("Received", places.length, "places");

        //----------------------------------------------------
        // Filter
        //----------------------------------------------------

        places = places.filter(place =>
            place.review >= CONFIG.minReviews &&
            place.rating >= CONFIG.minRating
        );

        console.log("Remaining", places.length);

        //----------------------------------------------------
        // Encode
        //----------------------------------------------------

        const encodedFiltered = encodeBase64Json(places);

        //----------------------------------------------------
        // Build response
        //----------------------------------------------------

        const headers = new Headers(response.headers);

        headers.delete("content-length");

        return new Response(encodedFiltered, {
            status: response.status,
            statusText: response.statusText,
            headers
        });

    };

})();
