const fs = require("fs");

const argv = process.argv;
const zpkfile = argv[2];
console.log("unpack zpkfile : " + zpkfile);

const path = zpkfile.substring(0, zpkfile.lastIndexOf("."));
try {
    fs.accessSync(path);
} catch (err) {
    fs.mkdirSync(path);
}

fs.readFile(zpkfile, (error, data) => unpackZpk(data, (item) => { fs.writeFile(path + "/" + item.filename, item.data, err => err ? console.log(err) : ""); }));

// bytes.js
function bytesToInt(src, offset) {
    var cnt = 4;
    var val = 0;
    for (var i = cnt - 1; i >= 0; i--) {
        val += src[offset + i];
        if (i > 0) {
            val = val << 8;
        }
    }
    return val;
}

function Utf8ArrayToStr(array, offset, len) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    i = 0;
    while (i < len) {
        c = array[offset + i++];
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[offset + i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[offset + i++];
                char3 = array[offset + i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }
    return out;
}


// zpk.js
function unpackZpk(filecontent, onFileUnpacked) {
    var files = [];
    var data = new Uint8Array(filecontent);
    const offsetOfHintBlock = bytesToInt(data, 4 * 4);
    const cntFiles = bytesToInt(data, 3 * 4);
    const offsetOfFileNameBlock = bytesToInt(data, 6 * 4);
    const names = Utf8ArrayToStr(data, offsetOfFileNameBlock, filecontent.byteLength - offsetOfFileNameBlock).split("\n");
    for (var i = 0; i < cntFiles; i++) {
        const begin = bytesToInt(data, offsetOfHintBlock + i * 12 * 4 + 0);
        const length = bytesToInt(data, offsetOfHintBlock + i * 12 * 4 + 4 * 4);
        const fileData = filecontent.slice(begin, begin + length);
        const file = {
            filename: names[i],
            data: fileData,
        };
        if (onFileUnpacked) onFileUnpacked(file);
        files[i] = file;
    }
    return files;
}
