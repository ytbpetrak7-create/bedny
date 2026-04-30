async function getInventory() {
  const uid = localStorage.getItem("userid");
  return await callScript("getInventory", { userid: uid });
}