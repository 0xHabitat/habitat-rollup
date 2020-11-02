for (var i = 0; i < 6; i++) {
  var key = '2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120' + i.toString();
  var addr;

  try {
    addr = personal.importRawKey(key, null);
  } catch (e) {
    console.error(e);
  }
}
for (var i = 0; i < personal.listAccounts.length; i++) {
  personal.unlockAccount(personal.listAccounts[i], '', ~0 >>> 0);
}
miner.start();
