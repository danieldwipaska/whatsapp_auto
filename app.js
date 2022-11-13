const wa = require('@open-wa/wa-automate');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const mime = require('mime-types');
const Jadwal = require('./models/Jadwal');
const Subs = require('./models/Subs');
const Tata = require('./models/Tata');
const Teks = require('./models/Teks');
const Warta = require('./models/Warta');
const { decryptMedia } = require('wa-decrypt');
dotenv.config();

const connectDB = async () => {
  try {
    mongoose.connect(process.env.MONGO_SECRET, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log('MongoDB connected!!');
  } catch (err) {
    console.log('Failed to connect to MongoDB', err);
  }
};
connectDB();

wa.create({
  sessionId: 'COVID_HELPER',
  multiDevice: true, //required to enable multiDevice support
  authTimeout: 60, //wait only 60 seconds to get a connection with the host account device
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,
  qrTimeout: 0, //0 means it will wait forever for you to scan the qr code
}).then((client) => start(client));

function start(client) {
  client.onMessage(async (message) => {
    const replyError = '[PESAN OTOMATIS]\nTerjadi gangguan.\nSilahkan coba beberapa saat lagi';
    const replyLoading = '[PESAN OTOMATIS]\nMohon tunggu...';
    if (message.from === process.env.ADMIN_NUMBER) {
      if (message.mimetype) {
        if (message.mimetype === 'image/jpeg' || message.mimetype === 'image/jpg' || message.mimetype === 'image/png') {
          await client.sendText(message.from, replyLoading);
          const mediaData = await decryptMedia(message);
          const fileBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
          // await client.sendFile(message.from, imageBase64, message.text, `You just sent me this ${message.type}`);
          const newJadwal = new Jadwal({ dataType: message.mimetype, data: fileBase64, dataName: 'undefined' });
          await newJadwal.save();
          await client.sendText(message.from, 'Jadwal diterima');
        } else if (message.mimetype === 'application/pdf' && message.text.indexOf('warta_jemaat') === 0) {
          await client.sendText(message.from, replyLoading);
          const mediaData = await decryptMedia(message);
          const fileBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
          const newWarta = new Warta({ dataType: message.mimetype, data: fileBase64, dataName: message.text });
          await newWarta.save();
          await client.sendText(message.from, 'Warta diterima');
        } else if (message.mimetype === 'application/pdf' && message.text.indexOf('tata_ibadah') === 0) {
          await client.sendText(message.from, replyLoading);
          const mediaData = await decryptMedia(message);
          const fileBase64 = `data:${message.mimetype};base64,${mediaData.toString('base64')}`;
          const newTata = new Tata({ dataType: message.mimetype, data: fileBase64, dataName: message.text });
          await newTata.save();
          await client.sendText(message.from, 'Warta diterima');
        } else {
          await client.sendText(message.from, '[PESAN OTOMATIS]\nFile tidak dikenal');
        }
      } else {
        if (message.body.indexOf('!Teks') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const teksSlice = message.body.slice(5);
            const teksContent = '*[PESAN OTOMATIS KHUSUS PELANGGAN]*\n' + teksSlice;
            const newTeks = new Teks({ content: teksContent, author: message.from });
            await newTeks.save();
            await client.sendText(message.from, 'teks diterima');
            // console.log(newTeks);
            //update
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('!LihatTeks') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const teks = await Teks.find().sort({ createdAt: -1 });
            if (teks[0] === undefined) {
              await client.sendText(message.from, 'teks belum ada');
            } else {
              await client.sendText(message.from, teks[0].content);
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('!LihatWarta') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const warta = await Warta.find().sort({ createdAt: -1 });
            if (warta[0] === undefined) {
              await client.sendText(message.from, 'warta jemaat belum ada');
            } else {
              await client.sendFile(message.from, warta[0].data, warta[0].dataName, 'Warta Jemaat');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('!LihatTata') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const tata = await Tata.find().sort({ createdAt: -1 });
            if (tata[1] === undefined) {
              await client.sendText(message.from, 'tata ibadah belum ada atau cuma satu.');
            } else {
              await client.sendFile(message.from, tata[0].data, tata[0].dataName, 'Tata Ibadah 1');
              await client.sendFile(message.from, tata[1].data, tata[1].dataName, 'Tata Ibadah 2');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('!LihatJadwal') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const jadwal = await Jadwal.find().sort({ createdAt: -1 });
            if (jadwal[0] === undefined) {
              await client.sendText(message.from, 'jadwal belum ada');
            } else {
              await client.sendFile(message.from, jadwal[0].data, 'image', 'Jadwal Ibadah sepekan');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('!BroadcastTeks') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const teks = await Teks.find().sort({ createdAt: -1 });
            if (teks[0] === undefined) {
              await client.sendText(message.from, 'teks belum ada');
            } else {
              const subses = await Subs.find();
              for (let i = 0; i < subses.length; i++) {
                await client.sendText(subses[i].phone, teks[0].content);
              }
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('!JumlahSubscriber') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const subses = await Subs.find();
            const subsesStr = subses.length.toString();
            await client.sendText(message.from, subsesStr);
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else {
          await client.sendText(
            message.from,
            'Kata kunci salah.\nKata Kunci:\n\n        !Teks\n        !LihatTeks\n        !LihatWarta\n        !LihatTata\n        !LihatJadwal\n        !BroadcastTeks\n        !JumlahSubscriber\n\nFormat nama file: \n_warta_jemaat_02-01-22_\n_tata_ibadah_19-05-22_1_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
          );
        }
      }
    } else {
      const lastMessage = await client.getMyLastMessage(message.from);
      if (lastMessage) {
        if (message.body.indexOf('Mulai') === 0 || message.body.indexOf('mulai') === 0) {
          const reply1 = '[PESAN OTOMATIS]\nSilahkan membalas pesan ini dengan kata kunci yang tersedia.';
          const reply2 =
            'Kata kunci:\n\n*_Warta_* = Untuk mendapatkan Warta Jemaat Terbaru.\n\n*_Tata_* = Untuk mendapatkan Tata Ibadah Minggu.\n\n*_Jadwal_* = Untuk mendapatkan Jadwal Ibadah Sepekan\n\n*_Langganan_* = Untuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n\n*_Berhenti_* = Untuk berhenti berlangganan.';
          await client.sendText(message.from, reply1);
          await client.sendText(message.from, reply2);
        } else if (message.body.indexOf('Jadwal') === 0 || message.body.indexOf('jadwal') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            //LIHAT JADWAL
            const jadwal = await Jadwal.find().sort({ createdAt: -1 });
            if (!jadwal) {
              await client.sendText(message.from, '[PESAN OTOMATIS]\nJadwal Ibadah belum ada.');
            } else {
              await client.sendImage(message.from, jadwal[0].data, 'image', 'Jadwal Ibadah Sepekan');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('Tata') === 0 || message.body.indexOf('tata') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const tata = await Tata.find().sort({ createdAt: -1 });
            if (tata.length < 2) {
              await client.sendText(message.from, '[PESAN OTOMATIS]\nMohon maaf, Tata ibadah belum ada.');
            } else {
              await client.sendFile(message.from, tata[0].data, tata[0].dataName, 'Tata Ibadah 1');
              await client.sendFile(message.from, tata[1].data, tata[1].dataName, 'Tata Ibadah 2');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('Warta') === 0 || message.body.indexOf('warta') === 0) {
          await client.sendText(message.from, replyLoading);
          try {
            const warta = await Warta.find().sort({ createdAt: -1 });
            if (!warta) {
              await client.sendText(message.from, '[PESAN OTOMATIS]\nWarta Jemaat belum ada.');
            } else {
              await client.sendFile(message.from, warta[0].data, warta[0].dataName, 'Warta Jemaat');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('Langganan') === 0 || message.body.indexOf('langganan') === 0) {
          try {
            const subs = await Subs.findOne({ phone: message.from });
            if (subs) {
              await client.sendText(message.from, '[PESAN OTOMATIS]\nAnda SUDAH berlangganan.');
            } else {
              const newSubs = new Subs({ phone: message.from });
              await newSubs.save();
              await client.sendText(message.from, '[PESAN OTOMATIS]\nAnda sudah berlangganan.\nNantikan informasi seputar GPIB Immanuel malang di kemudian hari.\nTerima kasih, Tuhan Yesus memberkati.');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else if (message.body.indexOf('Berhenti') === 0 || message.body.indexOf('berhenti') === 0) {
          try {
            const subs = await Subs.findOne({ phone: message.from });
            if (!subs) {
              await client.sendText(message.from, '[PESAN OTOMATIS]\nAnda BELUM berlangganan. Silahkan balas dengan kata kunci:\n\n        *_Langganan_*\n\nUntuk berlangganan secara GRATIS.');
            } else {
              await Subs.findOneAndDelete({ phone: message.from });
              await client.sendText(message.from, '[PESAN OTOMATIS]\nAnda BERHENTI berlangganan.\nTerima kasih, Tuhan Yesus memberkati.');
            }
          } catch (err) {
            await client.sendText(message.from, replyError);
          }
        } else {
          //   await client.sendText(message.from, '👋 Hello!');
          const opening =
            '[PESAN OTOMATIS]\nLayanan Whatsapp\nGPIB Immanuel Malang\n\nKata kunci yang anda masukkan SALAH, atau anda BELUM memulai layanan ini. Untuk memulai, silahkan balas pesan ini dengan kata kunci:\n\n       _*Mulai*_';
          await client.sendText(message.from, opening);
        }
      } else {
        const welcome =
          '[PESAN OTOMATIS]\nSELAMAT DATANG di\nLayanan Whatsapp\nGPIB Immanuel Malang\n\nAnda bisa mendapatkan Warta Jemaat, Tata Ibadah Minggu, dan Jadwal Ibadah Sepekan. Untuk memulai, silahkan balas pesan ini dengan kata kunci:\n\n       _*Mulai*_';
        await client.sendText(message.from, welcome);
      }
    }
  });
}
//edit

// if (message.from === process.env.ADMIN_NUMBER) {
//     if (message.hasMedia) {
//       const mediaReceived = await message.downloadMedia();
//       if (mediaReceived.filename === undefined) {
//         mediaReceived.filename = 'undefined';
//       }
//       if (mediaReceived.filename.indexOf('warta_jemaat') === 0) {
//         //SIMPAN WARTA JEMAAT KE DB
//         const newWarta = new Warta({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
//         await newWarta.save();

//         //REPLY TO ADMIN
//         await client.sendMessage(message.from, 'warta jemaat diterima');
//       } else if (mediaReceived.filename.indexOf('1_tata_ibadah') === 0 || mediaReceived.filename.indexOf('2_tata_ibadah') === 0) {
//         //SIMPAN TATA IBADAH KE DB
//         const newTata = new Tata({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
//         await newTata.save();

//         //REPLY TO ADMIN
//         await client.sendMessage(message.from, 'tata ibadah diterima');
//       } else if (mediaReceived.filename === 'undefined') {
//         //SIMPAN WARTA JEMAAT KE DB
//         const newJadwal = new Jadwal({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
//         await newJadwal.save();

//         //REPLY TO ADMIN
//         await client.sendMessage(message.from, 'jadwal ibadah diterima');
//       } else {
//         // console.log(media);
//         await client.sendMessage(
//           message.from,
//           'File tidak dikenal. Pastikan nama file dan jenis file yang anda masukkan sudah benar.\nFormat nama file: \n_warta_jemaat_02-01-22_\n_1_tata_ibadah_19-05-22_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
//         );
//       }
//     } else {
//       if (message.body.indexOf('!Teks') === 0) {
//         const teksSlice = message.body.slice(5);
//         const teksContent = '*[PESAN OTOMATIS KHUSUS PELANGGAN]*\n' + teksSlice;
//         const newTeks = new Teks({ content: teksContent, author: message.from });
//         await newTeks.save();
//         await client.sendMessage(message.from, 'teks diterima');
//         // console.log(newTeks);
//         //update
//       } else if (message.body.indexOf('!LihatTeks') === 0) {
//         const teks = await Teks.find().sort({ createdAt: -1 });
//         if (teks[0] === undefined) {
//           await client.sendMessage(message.from, 'teks belum ada');
//         } else {
//           await client.sendMessage(message.from, teks[0].content);
//         }
//       } else if (message.body.indexOf('!LihatWarta') === 0) {
//         const warta = await Warta.find().sort({ createdAt: -1 });
//         if (warta[0] === undefined) {
//           await client.sendMessage(message.from, 'warta jemaat belum ada');
//         } else {
//           const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
//           await client.sendMessage(message.from, media);
//         }
//       } else if (message.body.indexOf('!LihatTata') === 0) {
//         const tata = await Tata.find().sort({ createdAt: -1 });
//         if (tata[1] === undefined) {
//           await client.sendMessage(message.from, 'tata ibadah belum ada atau cuma satu.');
//         } else {
//           const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
//           const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
//           await client.sendMessage(message.from, media1);
//           await client.sendMessage(message.from, media2);
//         }
//       } else if (message.body.indexOf('!LihatJadwal') === 0) {
//         const jadwal = await Jadwal.find().sort({ createdAt: -1 });
//         if (jadwal[0] === undefined) {
//           await client.sendMessage(message.from, 'jadwal belum ada');
//         } else {
//           const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data, jadwal[0].dataName);
//           await client.sendMessage(message.from, media);
//         }
//       } else if (message.body.indexOf('!BroadcastTeks') === 0) {
//         const teks = await Teks.find().sort({ createdAt: -1 });
//         if (teks[0] === undefined) {
//           await client.sendMessage(message.from, 'teks belum ada');
//         } else {
//           const subses = await Subs.find();
//           for (let i = 0; i < subses.length; i++) {
//             await client.sendMessage(subses[i].phone, teks[0].content);
//           }
//         }
//       } else if (message.body.indexOf('!BroadcastWarta') === 0) {
//         const warta = await Warta.find().sort({ createdAt: -1 });
//         if (warta[0] === undefined) {
//           await client.sendMessage(message.from, 'warta jemaat belum ada');
//         } else {
//           const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
//           const subses = await Subs.find();
//           for (let i = 0; i < subses.length; i++) {
//             await client.sendMessage(subses[i].phone, media);
//           }
//         }
//       } else if (message.body.indexOf('!BroadcastTata') === 0) {
//         const tata = await Tata.find().sort({ createdAt: -1 });
//         if (tata[0] === undefined) {
//           await client.sendMessage(message.from, 'tata ibadah belum ada');
//         } else {
//           const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
//           const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
//           const subses = await Subs.find();
//           for (let i = 0; i < subses.length; i++) {
//             await client.sendMessage(subses[i].phone, media1);
//             await client.sendMessage(subses[i].phone, media2);
//           }
//         }
//       } else if (message.body.indexOf('!BroadcastJadwal') === 0) {
//         const jadwal = await Jadwal.find().sort({ createdAt: -1 });
//         if (jadwal[0] === undefined) {
//           await client.sendMessage(message.from, 'jadwal ibadah belum ada');
//         } else {
//           const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data, jadwal[0].dataName);
//           const subses = await Subs.find();
//           for (let i = 0; i < subses.length; i++) {
//             await client.sendMessage(subses[i].phone, media);
//           }
//         }
//       } else if (message.body.indexOf('!JumlahSubscriber') === 0) {
//         const subses = await Subs.find();
//         const subsesStr = subses.length.toString();
//         await client.sendMessage(message.from, subsesStr);
//       } else if (message.body.indexOf('!UpdateTanggal') === 0) {
//         //FIND NEWEST WARTA
//         const warta = await Warta.find().sort({ createdAt: -1 });
//         if (warta.length === 0) {
//           await client.sendMessage('Warta jemaat BELUM ADA.');
//         } else {
//           const wartaNameArr = warta[0].dataName.split('');
//           let wartaDateArr = [];
//           for (let i = 13; i < 21; i++) {
//             wartaDateArr.push(wartaNameArr[i]);
//           }
//           const wartaDate = wartaDateArr.join('');
//           // console.log(wartaDate);
//           tanggalWarta = wartaDate;
//           await client.sendMessage(message.from, 'Tanggal Warta Jemaat berhasil di update.');
//         }

//         //FIND NEWEST TATA
//         const tata = await Tata.find().sort({ createdAt: -1 });
//         if (tata.length === 0) {
//           await client.sendMessage('Tata ibadah BELUM ADA.');
//         } else {
//           const tataNameArr = tata[0].dataName.split('');
//           let tataDateArr = [];
//           for (let i = 14; i < 22; i++) {
//             tataDateArr.push(tataNameArr[i]);
//           }
//           const tataDate = tataDateArr.join('');
//           // console.log(tataDate);
//           tanggalTata = tataDate;
//           await client.sendMessage(message.from, 'Tanggal Tata Ibadah berhasil di update.');
//         }
//         // tanggalWarta = wartaDate;
//       } else {
//         await client.sendMessage(
//           message.from,
//           'Kata kunci salah.\nKata Kunci:\n\n        !Teks\n        !LihatTeks\n        !LihatWarta\n        !LihatTata\n        !LihatJadwal\n        !BroadcastTeks\n        !BroadcastWarta\n        !BroadcastTata\n        !BroadcastJadwal\n        !JumlahSubscriber\n        !UpdateTanggal\n\nFormat nama file: \n_warta_jemaat_02-01-22_\n_1_tata_ibadah_19-05-22_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
//         );
//       }
//     }
//   } else {
//     // await client.sendMessage(message.from, 'SELAMAT DATANG di \n*Layanan Whatsapp*\n*_GPIB Immanuel Malang_*\n\nLayanan ini akan mulai beroperasi tanggal *22 Oktober 2022.*\n\nTuhan Yesus memberkati.');

//     // await client.sendMessage(message.from, button);

//     // //FIND NEWEST WARTA & TATA
//     // const warta = await Warta.find().sort({ createdAt: -1 });
//     // const wartaNameArr = warta[0].dataName.split('');
//     // let wartaDateArr = [];
//     // for (let i = 13; i < 21; i++) {
//     //   wartaDateArr.push(wartaNameArr[i]);
//     // }
//     // const wartaDate = wartaDateArr.join('');
//     // // console.log(wartaDate);

//     // const tata = await Tata.find().sort({ createdAt: -1 });
//     // const tataNameArr = tata[0].dataName.split('');
//     // let tataDateArr = [];
//     // for (let i = 12; i < 20; i++) {
//     //   tataDateArr.push(tataNameArr[i]);
//     // }
//     // const tataDate = tataDateArr.join('');
//     // // console.log(tataDate);
//     // // console.log(warta);

//     // //REPLY PERTAMA
//     // const buttons_reply = new Buttons(
//     //   `Ini adalah Layanan Whatsapp GPIB Immanuel Malang.\nAnda bisa mendapatkan dokumen Warta Jemaat dan Jadwal Ibadah PELKAT dengan menekan tombol di bawah.\nLayanan ini tersedia 24 jam.\n\n_Dokumen yang tersedia:_\n_Warta Jemaat: tanggal ${wartaDate}_\n_Tata Ibadah: tanggal ${tataDate}_`,
//     //   [
//     //     { body: 'Warta Jemaat', id: 'test-1' },
//     //     { body: 'Tata Ibadah', id: 'test-2' },
//     //     { body: 'Jadwal Ibadah', id: 'test-3' },
//     //   ],
//     //   'SELAMAT DATANG!!!',
//     //   'Pilih dokumen yang anda inginkan'
//     // ); // Reply button

//     //  // REPLY KEDUA
//     // const buttons_reply_lainlain = new Buttons('GPIB Immanuel Malang juga dapat memberi anda dokumen-dokumen lainnya, seperti:', [
//     //   { body: 'Litbang', id: 'test-4' },
//     //   { body: 'Info', id: 'test-5' },
//     //   { body: 'Merchandise', id: 'test-6' },
//     // ]); // Reply button

//     // //OPENING
//     // const buttons_reply_mulai = new Buttons('Layanan ini sudah berakhir atau belum dimulai.', [{ body: 'Mulai', id: 'test-4' }], 'Layanan Whatsapp GPIB Immanuel Malang', 'Silahkan tekan tombol di bawah untuk memulai.'); // Reply button

//     // const buttons_reply_kembali = new Buttons('Butuh dokumen lainnya?', [{ body: 'Kembali ke menu utama', id: 'test-5' }]); // Reply button

//     // // const media = MessageMedia.fromFilePath('./public/pdf/warta_jemaat_minggu_tanggal.pdf');

//     if (message.body === 'Langganan') {
//       try {
//         const subs = await Subs.findOne({ phone: message.from });
//         if (subs) {
//           await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda SUDAH berlangganan.');
//         } else {
//           const newSubs = new Subs({ phone: message.from });
//           await newSubs.save();
//           await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda sudah berlangganan.\nNantikan informasi seputar GPIB Immanuel malang di kemudian hari.\nTerima kasih, Tuhan Yesus memberkati.');
//         }
//       } catch (err) {
//         await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAdmin Server Error.\nMohon coba lagi.');
//       }
//     } else if (message.body === 'Berhenti Langganan') {
//       try {
//         const subs = await Subs.findOne({ phone: message.from });
//         if (!subs) {
//           await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda BELUM berlangganan. Silahkan balas dengan kata kunci:\n\n        *_Langganan_*\n\nUntuk berlangganan secara GRATIS.');
//         } else {
//           await Subs.findOneAndDelete({ phone: message.from });
//           await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda BERHENTI berlangganan.\nTerima kasih, Tuhan Yesus memberkati.');
//         }
//       } catch (err) {
//         await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAdmin Server Error.\nMohon coba lagi.');
//       }
//     } else if (message.body === 'Warta Jemaat') {
//       await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nSedang mengirim...\nHarap menunggu...');
//       try {
//         const warta = await Warta.find().sort({ createdAt: -1 });
//         if (warta.length === 0) {
//           await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Warta Jemaat belum ada.');
//         } else {
//           const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
//           await client.sendMessage(message.from, media);
//         }
//       } catch (err) {
//         await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAdmin Server Error.\nMohon coba lagi.');
//       }
//     } else if (message.body === 'Tata Ibadah') {
//       await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nSedang mengirim...\nHarap menunggu...');
//       try {
//         const tata = await Tata.find().sort({ createdAt: -1 });
//         if (tata.length < 2) {
//           await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Tata ibadah belum ada.');
//         } else {
//           const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
//           const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
//           await client.sendMessage(message.from, media1);
//           await client.sendMessage(message.from, media2);
//         }
//       } catch (err) {
//         await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAdmin Server Error.\nMohon coba lagi.');
//       }
//     } else if (message.body === 'Jadwal Ibadah') {
//       await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nSedang mengirim...\nHarap menunggu...');
//       try {
//         //LIHAT JADWAL
//         const jadwal = await Jadwal.find().sort({ createdAt: -1 });
//         const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data);
//         await client.sendMessage(message.from, media);
//       } catch (err) {
//         await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAdmin Server Error.\nMohon coba lagi.');
//       }
//     } else if (message.body === 'Mulai') {
//       if (!tanggalWarta) {
//         tanggalWarta = 'DD/MM/YY';
//       }
//       if (!tanggalTata) {
//         tanggalTata = 'DD/MM/YY';
//       }
//       //REPLY PERTAMA
//       const buttons_reply = new Buttons(
//         `[PESAN OTOMATIS]\n\nIni adalah Layanan Whatsapp GPIB Immanuel Malang.\nAnda bisa mendapatkan dokumen Warta Jemaat, Tata Ibadah Minggu, dan Jadwal Ibadah Sepekan, dengan menekan tombol di bawah.\nLayanan ini tersedia 24 jam.\n\n_Dokumen yang tersedia:_\n_Warta Jemaat: tanggal ${tanggalWarta}_\n_Tata Ibadah: tanggal ${tanggalTata}_`,
//         [
//           { body: 'Warta Jemaat', id: 'test-1' },
//           { body: 'Tata Ibadah', id: 'test-2' },
//           { body: 'Jadwal Ibadah', id: 'test-3' },
//         ],
//         'SELAMAT DATANG!!!',
//         'Pilih dokumen yang anda inginkan'
//       ); // Reply button

//       await client.sendMessage(message.from, buttons_reply);

//       // const reply1 = `[PESAN OTOMATIS]\n\nIni adalah Layanan Whatsapp GPIB Immanuel Malang.\nAnda bisa mendapatkan dokumen Warta Jemaat, Tata Ibadah Minggu, dan Jadwal Ibadah Sepekan\ndengan cara membalas pesan ini dengan kata kunci:\n\n        *_Warta_*\n\nUntuk mendapatkan Warta Jemaat Terbaru.\n\n        *_Tata_*\n\nUntuk mendapatkan Tata Ibadah Minggu.\n\n        *_Jadwal_*\n\nUntuk mendapatkan Jadwal Ibadah Sepekan\n\nLayanan ini tersedia 24 jam.\n\nDokumen yang tersedia:\nWarta Jemaat tanggal ${tanggalWarta}\nTata Ibadah tanggal ${tanggalTata}`;

//       // await client.sendMessage(message.from, reply1);
//     } else {
//       //OPENING
//       const buttons_reply_mulai = new Buttons(
//         '[PESAN OTOMATIS]\n\nLayanan ini sudah berakhir atau belum dimulai.\n\nSilahkan balas pesan ini dengan menekan tombol di bawah.\n\nKeterangan:\n\n*_Mulai_* = Untuk memulai layanan Whatsapp ini.\n\n*_Langganan_* = Untuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n\n*_Berhenti_* = Untuk berhenti berlangganan.',
//         [
//           { body: 'Mulai', id: 'test-4' },
//           { body: 'Langganan', id: 'test-5' },
//           { body: 'Berhenti Langganan', id: 'test-6' },
//         ],
//         'Layanan Whatsapp GPIB Immanuel Malang',
//         'Silahkan tekan tombol di bawah.'
//       ); // Reply button

//       await client.sendMessage(message.from, buttons_reply_mulai);

//       // const mulai =
//       //   '[PESAN OTOMATIS]\nLayanan Whatsapp GPIB Immanuel Malang\n\nLayanan ini sudah berakhir atau belum dimulai.\n\nSilahkan balas pesan ini dengan:\n\n        *_Mulai_*\n\nUntuk memulai layanan Whatsapp ini.\n\n        *_Langganan_*\n\nUntuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n\n        *_Berhenti_*\n\nUntuk berhenti berlangganan.';

//       // await client.sendMessage(message.from, mulai);
//     }
//   }
