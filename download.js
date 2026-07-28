const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'assets');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

async function download(url, filename) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
}

async function main() {
  await download('https://www.w3schools.com/html/mov_bbb.mp4', 'dummy_video.mp4');
  await download('https://picsum.photos/seed/derma1/800/600.jpg', 'placeholder1.jpg');
  await download('https://picsum.photos/seed/derma2/800/600.jpg', 'placeholder2.jpg');
  await download('https://picsum.photos/seed/derma3/800/600.jpg', 'placeholder3.jpg');
  console.log('Downloaded all assets.');
}
main();
