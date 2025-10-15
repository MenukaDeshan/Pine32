function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('password').value;
  fetch('/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'password=' + encodeURIComponent(password)
  }).then(res => {
    if (res.ok) window.location.href = '/index.html';
    else alert('Incorrect password!');
  });
  return false;
}
