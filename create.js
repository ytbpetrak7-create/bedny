const items = [
    {Image: "125a28f5-dea6-4922-b8a3-02493aecd3db.png", chance: 30, name : "item1"},
    {Image: "", chance: 30, name : "item2"},
    {Image: "", chance: 30, name : "item3"},
    {Image: "", chance: 5, name : "m4a1-s"},
    {Image: "", chance: 2, name : "awp"}
]

function pickitem() {
    let value = Math.random() * 1000;
    let finalitem;
    while (true) {
        const item = items.pop();
        items.unshift(item);
        value -= item.chance;
        if (value <= 0) {
            finalitem = item;
            break;
        }
    }
    return finalitem;
}


document.querySelector(".open").addEventListener("click", () => {
    const item = pickitem();
    document.getElementById("item").src = item.Image;
    document.getElementById("itemname").innerText = item.name;
    //https://script.google.com/macros/s/AKfycbz_o1SKbdsS0-qqN0jRRv7v8N71QhQDKvL-ZqJSFbRf1ZB5-z0yW4gCk9ukHsNV5Sjvtg/exec?value=ahoj
    fetch("https://script.google.com/macros/s/AKfycbz_o1SKbdsS0-qqN0jRRv7v8N71QhQDKvL-ZqJSFbRf1ZB5-z0yW4gCk9ukHsNV5Sjvtg/exec?value=" + item.name)
        .then(response => response.text())
        .then(data => console.log(data));
})
function spin() {
  const itemWidth = 150; // Šířka itemu + margin
  const winningIndex = 40; // Index vyhraného předmětu
  const offset = 300; // Polovina šířky okna, aby byl vítěz uprostřed
  
  // Výpočet finální pozice s mírnou náhodností, aby to nekončilo vždy přesně ve středu karty
  const landingPosition = (winningIndex * itemWidth) - offset + (Math.random() * 80);
  
  document.getElementById('cardList').style.transform = `translateX(-${landingPosition}px)`;
}
