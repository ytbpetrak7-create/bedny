const items = [
    {Image: "mac 10 ens.png", chance: 25, name : "MAC-10 | Ensnared"},
    {Image: "m4a4 etch lord.png", chance: 25, name : "M4A4 | Etch Lord"},
    {Image: "eagel urban.png", chance: 20, name : "Desert Eagle | Urban Rubble"},
    {Image: "a1s n terror.png", chance: 15, name : "M4A1-S | Night Terror"},
    {Image: "mac10 light box.png", chance: 15, name : "MAC-10 | Light Box"},
    {Image: "glock win.png", chance: 5, name : "Glock-18 | Winterized"},
    {Image: "cz copper.png", chance: 2, name : "CZ75-Auto | Copper Fiber"},
    

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
