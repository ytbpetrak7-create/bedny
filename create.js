document.querySelector(".open").addEventListener("click", async () => {
    document.getElementById("openBoxButton").remove();
    let [name, image] = (await open("Boxes1")).split("|");
    let itemImg = document.getElementById("itemimg");
    itemImg.src = image;
    document.getElementById("itemname").textContent = name;
})
