fetch('http://localhost:8080/api/tipos-resolucion')
    .then(res => {
        console.log("Status:", res.status);
        return res.text();
    })
    .then(text => {
        console.log("Response text:", text);
    })
    .catch(err => {
        console.error("Error:", err);
    });
