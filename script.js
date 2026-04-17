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
        window.location = './prbenda.html';
    } else if (kod.value =="") {
        window.location = './1bed.html';
    } else if (kod.value =="") {
        window.location = './1bed.html';
    }
} 

function spin() {
  const itemWidth = 150; // Šířka itemu + margin
  const winningIndex = 40; // Index vyhraného předmětu
  const offset = 300; // Polovina šířky okna, aby byl vítěz uprostřed
  
  // Výpočet finální pozice s mírnou náhodností, aby to nekončilo vždy přesně ve středu karty
  const landingPosition = (winningIndex * itemWidth) - offset + (Math.random() * 80);
  
  document.getElementById('cardList').style.transform = `translateX(-${landingPosition}px)`;
}
