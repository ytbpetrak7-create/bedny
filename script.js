function rozbalit() {
    document.querySelector(".rozbalovaci")
        .classList.toggle("rozbaleno")
}

function overitkod() {
    let kod = document.getElementById("kod");
    if (kod.value =="nicnepadne") { 
        let KodPouzit = localStorage.getItem("kodPouzit");
        if (KodPouzit === "true") {
            alert("Tento kod jsi již použil");
            return;
        }
            localStorage.setItem("kodPouzit", "true");
        window.location = './prbenda.html';
    } else if (kod.value =="kkt") {
        window.location = './prbenda.html';
    
            } else if (kod.value =="proc") {
            } else if (kod.value =="test2") {
    }
                let KodPouzit = localStorage.getItem("kodPouzit");
        if (KodPouzit === "true") {
            alert("Tento kod jsi již použil");
            return;
        }
        localStorage.setItem("kodPouzit", "true");
        window.location = './dvebed.html';
    }
