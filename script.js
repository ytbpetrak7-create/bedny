function rozbalit() {
    document.querySelector(".rozbalovaci")
        .classList.toggle("rozbaleno")
}

async function overitkod() {
    let kod = document.getElementById("kod");
    let okButton = document.getElementById("ok-button") ;
    okButton.disabled = true; // Deaktivace tlačítka
    let odpoved = await useCode(kod.value);
    okButton.disabled = false; // Aktivace tlačítka
    if (isNaN(odpoved)) {
        alert(odpoved + ". Zkuste to znovu.");
        kod.value = "";
    } else {
        alert("body přidány: " + odpoved);
    }
}
