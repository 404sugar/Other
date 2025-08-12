let token = "";

async function unlock() {
  const password = document.getElementById('password').value;

  try {
    const res = await fetch("othercrypt.txt");
    const rawText = await res.text();
    const encryptedToken = rawText.replace(/^\uFEFF/, '').trim();

    const decrypted = CryptoJS.AES.decrypt(encryptedToken, password);
    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    const cleaned = plain.replace(/[^\x20-\x7E]/g, '').trim();

    if (!cleaned || (!cleaned.startsWith("ghp_") && !cleaned.startsWith("github_pat_"))) {
      alert("Token decrypted but format is unrecognized.");
      return;
    }

    token = cleaned;
    document.getElementById('uploadUI').style.display = 'block';
    alert("Unlocked successfully.");
  } catch (err) {
    alert("Failed to unlock: wrong password or corrupted token.");
    console.error("Decryption error:", err);
  }
}

async function upload() {
  const repo = 'Other';
  const owner = '404sugar';

  const imageFile = document.getElementById('imageFile').files[0];
  const rating = document.getElementById('rating').value.trim();
  const review = document.getElementById('review').value.trim();

  if (!review) return alert("Review text is required.");

  // Get current date and time in AWST
  const date = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Perth' });

  let imgName = "";
  let imageEntry = "";

  const proceed = async () => {
    const newEntry = `{${imageEntry ? `"${imageEntry}", ` : ""}"${review.replace(/\n/g, '\\n')}", "${rating}", "${date}"}\n`;

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/Other.txt`, {
        headers: { Authorization: `token ${token}` }
      });

      const data = await res.json();
      const rawContent = (data.content || '').replace(/\n/g, '').trim();

      let decoded = "";
      try {
        decoded = rawContent ? decodeURIComponent(escape(atob(rawContent))) : "";
      } catch (decodeErr) {
        console.warn("Base64 decode failed. Starting fresh.");
      }

      const updatedContent = decoded + newEntry;

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/Other.txt`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update Other.txt with new entry`,
          content: btoa(unescape(encodeURIComponent(updatedContent))),
          sha: data.sha
        })
      });

      alert("Upload complete!");
      document.getElementById('imageFile').value = "";
      document.getElementById('rating').value = "";
      document.getElementById('review').value = "";

    } catch (err) {
      alert("Upload failed: " + err.message);
      console.error("Upload error:", err);
    }
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      imgName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      imageEntry = `./Pics/${imgName}`;

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/Pics/${imgName}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add ${imgName}`,
          content: base64
        })
      });

      proceed();
    };
    reader.readAsDataURL(imageFile);
  } else {
    proceed();
  }
}
