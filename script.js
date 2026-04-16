function rozbalit() {
    document.querySelector(".rozbalovaci")
        .classList.toggle("rozbaleno")
}

function overitkod() {
    let kod = document.getElementById("kod");
    if (kod.value =="kamos") { 
        let KodPouzit = localStorage.getItem("kodPouzit");
        if (KodPouzit === "true") {
            alert("Tento kod jsi již použil");
            return;
        }
            localStorage.setItem("kodPouzit", "true");
        window.location = './1bed.html';
    } else if (kod.value =="") {
        window.location = './1bed.html';
    } else if (kod.value =="") {
        window.location = './1bed.html';
    }
} 

