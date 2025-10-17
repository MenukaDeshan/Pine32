function logout(){
  fetch('/logout', {method:'POST'}).then(()=>{
    location.href = '/login.html';
  });
}
