const items = [
    {Image: "mandrel nov.jpg", chance: 30, name : "nova Mandrel"},
    {Image: "m249.jpg", chance: 30, name : "M249 Sage Camo"},
    {Image: "snad spryvny glock.png", chance: 20, name : "Glock-18 Ocean Topo"},
    {Image: "usps.png", chance: 15, name : "usp-s PC-GRN"},
    {Image: "eagle.png", chance: 15, name : "desert eagle Tilted"},
    {Image: "emka.png", chance: 5, name : "m4a1-s Nitro"},
    {Image: "acheron awp.jpg", chance: 2, name : "awp Acheron"},
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
