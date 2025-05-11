function openFile(file) {
    const fileViewerContent = document.getElementById('fileViewerContent');
    fileViewerContent.innerHTML = ''; // Xóa nội dung cũ

    const fileExt = file.filename.split('.').pop().toLowerCase();
    const fileUrl = `/api/download/${file.filename}`;

    const opened = document.getElementById('opened-fileviewer');
    opened.textContent = `File opened: ${file.filename}`;

    switch (fileExt) {
        case 'pdf':
            const viewerUrl = `/pdfjs/web/viewer.html?file=${fileUrl}`;
            const iframe = document.createElement('iframe');
            iframe.src = viewerUrl;
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.style.border = 'none';
            iframe.style.minHeight = '400px';
            iframe.allowFullscreen = true;

            // Đảm bảo responsive
            iframe.style.maxWidth = '100%';
            iframe.style.display = 'block';

            const iframeContainer = document.createElement('div');
            iframeContainer.style.display = 'flex';
            iframeContainer.style.justifyContent = 'center';
            iframeContainer.style.alignItems = 'center';
            iframeContainer.style.width = '100%';
            iframeContainer.appendChild(iframe);

            fileViewerContent.appendChild(iframeContainer);
            break;
        case 'jpg':
        case 'jpeg':
        case 'png':
            const img = document.createElement('img');
            img.src = fileUrl;
            img.style.width = '380px';

            // Tạo một container để căn giữa img
            const imgContainer = document.createElement('div');
            imgContainer.style.display = 'flex';
            imgContainer.style.justifyContent = 'center'; // Căn giữa theo trục X
            imgContainer.appendChild(img);

            fileViewerContent.appendChild(imgContainer);
            break;
        case 'mp4':
        case 'webm':
        case 'ogg':
            const video = document.createElement('video');
            video.src = fileUrl;
            video.controls = true;
            video.style.width = '380px';

            // Tạo một container để căn giữa video
            const videoContainer = document.createElement('div');
            videoContainer.style.display = 'flex';
            videoContainer.style.justifyContent = 'center'; // Căn giữa theo trục X
            videoContainer.appendChild(video);

            fileViewerContent.appendChild(videoContainer);
            break;
        case 'doc':
        case 'docx':
            fetch(fileUrl)
                .then(response => response.arrayBuffer())
                .then(data => {
                    mammoth.convertToHtml({ arrayBuffer: data })
                        .then(result => {
                            fileViewerContent.innerHTML = result.value; // Hiển thị HTML chuyển đổi từ .docx
                        })
                        .catch(err => {
                            console.error('Error converting docx:', err);
                        });
                })
                .catch(error => console.error('Error fetching docx:', error));
            break;
        case 'ppt':
        case 'pptx':
            fileViewerContent.innerHTML = "<p class='sorry'>Currently, PowerPoint file preview is not supported directly in the browser.<br>We have downloaded the file for you, you can convert the PPT/PPTX file to PDF, upload it to the website and try to open it again as PDF.</p><br>";
            downloadFile(file.filename);
            break;
        case 'xls':
        case 'xlsx':
            fetch(fileUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
                    const sheet = workbook.Sheets[sheetName];
                    const html = XLSX.utils.sheet_to_html(sheet); // Chuyển đổi sang HTML
                    fileViewerContent.innerHTML = html;
                })
                .catch(error => console.error('Error loading Excel:', error));
            break;
        default:
            const pre = document.createElement('pre');
            fetch(fileUrl)
                .then(response => response.text())
                .then(text => {
                    pre.textContent = text;
                    fileViewerContent.appendChild(pre);
                });
            break;
    }
    document.getElementById('fileViewerContainer').style.display = 'block'; // Hiển thị div file viewer
}

let files = [];

async function loadFiles() {
    const username = localStorage.getItem('username');
    const res = await fetch(`/api/files/${username}`);
    files = await res.json();
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Xóa danh sách cũ

    files.forEach(file => {
        const div = document.createElement('div');
        div.classList.add('file-item'); // Thêm class file-item
        
        // Decode tên file nếu cần
        let decodedFilename = file.filename;

        // Hiển thị tên file
        const filename = document.createElement('p');
        filename.textContent = decodedFilename;
        filename.classList.add('filename');

        // Thêm nút Download
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.classList.add('download');
        downloadBtn.addEventListener('click', () => downloadFile(file.filename)); // Gọi hàm downloadFile khi nhấn nút

        // Thêm nút Xóa
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete');
        deleteBtn.addEventListener('click', () => deleteFile(file.filename)); // Gọi hàm deleteFile khi nhấn nút

        div.appendChild(filename); // Thêm tên file vào div
        div.appendChild(downloadBtn); // Thêm nút Download vào div
        div.appendChild(deleteBtn); // Thêm nút Xóa vào div
        fileList.appendChild(div); // Thêm div vào danh sách
    });
}

// Hàm để tải file xuống
async function downloadFile(filename) {
    const res = await fetch(`/api/download/${filename}`);
    if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename; // Tên file khi tải xuống
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } else {
        alert('Failed to download file');
    }
}

// Hàm để xóa file
async function deleteFile(filename) {
    const confirmDelete = confirm('Are you sure you want to delete this file?');
    if (confirmDelete) {
        const res = await fetch(`/api/delete/${filename}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            alert('File deleted successfully');
            loadFiles(); // Tải lại danh sách file sau khi xóa
            const fileViewer = document.getElementById('fileViewerContainer');
            const openedFile = document.getElementById('opened-fileviewer');
            if (fileViewer.style.display !== 'none' && openedFile.textContent == `File opened: ${filename}`) {
                fileViewer.style.display = 'none';
            }
        } else {
            alert('Failed to delete file');
        }
    }
}

document.getElementById('register').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    alert('Registered successfully');
});
  
document.getElementById('login').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        document.getElementById('auth').style.display = 'none';
        document.getElementById('fileActions').style.display = 'block';
        document.getElementById('welcomeUsername').textContent = username; // Hiển thị tên người dùng
        loadFiles();
    } else {
        alert('Account not registered or the account info is not correct');
    }
});

document.getElementById('deleteAccount').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
        const confirmDelete = confirm('Are you sure you want to delete your account?');
        if (confirmDelete) {
            const deleteRes = await fetch(`/api/deleteAccount/${username}`, {
                method: 'DELETE',
            });
            if (deleteRes.ok) {
                alert('Account deleted successfully');
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                document.getElementById('auth').style.display = 'block';
                document.getElementById('fileActions').style.display = 'none';
                loadFiles();
            } else {
                alert('Failed to delete account');
            }
        }
    } else {
        alert('Invalid credentials');
    }
});
  
document.getElementById('upload').addEventListener('click', async () => {
    const fileInput = document.getElementById('file');
    if (fileInput.files[0] === undefined) {
        alert('Please select a file to upload.');
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('username', localStorage.getItem('username'));
    await fetch('/api/upload', { method: 'POST', body: formData });
    alert('File uploaded');
    loadFiles(); // Tải lại danh sách file
});

document.getElementById('file').addEventListener('change', (event) => {
    const fileName = event.target.files[0].name;
    document.getElementById('selectedFileName').textContent = `Selected file: ${fileName}`;
});

// Thêm sự kiện mở file khi nhấn vào tên file
document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('fileList');
    fileList.addEventListener('click', (event) => {
        if (event.target.classList.contains('filename')) {
            const filename = event.target.textContent;
            const file = files.find(f => f.filename === filename); // Tìm file đúng
            if (file) {
                openFile(file);
            } else {
                alert('File not found');
            }
        }
    });
});
