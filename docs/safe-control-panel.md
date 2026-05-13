# Safe Control Panel

## Ly do tich hop

Trong cac buoi demo truoc, WebSafeExchange van phu thuoc nhieu vao Safe official dashboard. Khi can kiem tra owner, threshold, nonce hoac giao dich dang cho ky, nguoi demo phai roi khoi ung dung, mo `app.safe.global`, chon dung network va nhap dia chi Safe. Dieu nay lam luong demo bi ngat quang va tao cam giac WebSafeExchange chua lam chu duoc workflow Safe.

Safe Control Panel duoc them vao WebSafeExchange de gom cac thao tac quan ly Safe co ban vao mot man hinh noi bo. Muc tieu la phuc vu demo va van giu Safe official dashboard nhu duong backup, khong phai luong chinh.

## Module moi giai quyet gi

Module moi co route `/safe-control` voi tieu de **Safe Control Panel**. Khi nguoi dung ket noi vi EOA bang MetaMask/wagmi, ung dung se tai danh sach Safe lien quan den owner do tren network hien tai. Tu danh sach nay, nguoi dung co the xem chi tiet Safe, owner, threshold, nonce, balance neu Safe API tra ve, va cac giao dich multisig dang pending.

Neu Safe Transaction Service khong kha dung, chua cau hinh cho chain hien tai, hoac bi loi khi goi API, module se hien du lieu **Testnet demo fallback**. Fallback nay duoc gan nhan ro rang va khong duoc trinh bay nhu du lieu that tren blockchain.

## Chuc nang da co

- Xem Safe theo owner EOA dang ket noi.
- Xem dia chi Safe, chain ID/network, owners, threshold, nonce, balance neu co.
- Kiem tra vi dang ket noi co phai owner cua Safe hay khong.
- Mo link Safe official dashboard nhu backup.
- Tao cau hinh Safe noi bo bang form owners, threshold, network va label tuy chon.
- Validate dia chi Ethereum va validate threshold nam trong khoang hop le.
- Xem danh sach pending Safe transactions: safeTxHash, destination, value, data summary, nonce, confirmations count, required confirmations va status.
- Co nut **Sign in app** cho pending transaction. Hien tai nut nay da noi vao adapter typed stub va thong bao ro: "Signing integration prepared. Requires Safe transaction service configuration."

## Phan dung Safe SDK/API

Ung dung da co san Safe SDK o `client/src/lib/safe-sdk.ts` va hook `client/src/hooks/use-safe-sdk.ts` cho cac thao tac Safe trong flow chuyen nhuong. Safe Control Panel khong thay the cac file do.

Adapter moi `client/src/lib/safe-control-panel.ts` goi Safe Transaction Service:

- `GET /api/v1/owners/{owner}/safes/` de lay Safe theo owner.
- `GET /api/v1/safes/{safe}/` de lay owners, threshold, nonce, version va balance neu API cung cap.
- `GET /api/v1/safes/{safe}/multisig-transactions/?executed=false&trusted=false` de lay pending multisig transactions.

Hien tai module ho tro URL Safe Transaction Service cho Ethereum Mainnet va Sepolia Testnet, phu hop voi cau hinh wagmi hien co cua project.

## Phan nhom tu xay

- Adapter layer `client/src/lib/safe-control-panel.ts`: gom cac ham `getSafesByOwner`, `getSafeDetails`, `getPendingSafeTransactions`, `prepareSafeCreation`, `proposeSafeTransaction`, `signSafeTransaction`.
- Hook `client/src/hooks/use-safe-control-panel.ts`: quan ly connected wallet, chain ID, danh sach Safe, Safe dang chon, pending transactions, prepared creation payload va signing result.
- UI `client/src/pages/safe-control.tsx`: man hinh quan ly Safe noi bo, khong thay doi luong transfer hien tai.
- Mapping du lieu Safe API ve kieu du lieu rieng cua WebSafeExchange.
- Validation form tao Safe config: owner address hop le, co it nhat 1 owner, threshold tu 1 den so owner.
- Flow ky giao dich trong app o muc prepared integration, co trang thai UI ro rang de khong gia lap thanh cong.

## Gioi han hien tai

- Chua deploy Safe that tu form tao Safe. Form hien chi tao **prepared configuration** va co ghi chu ro rang.
- Chua propose transaction len Safe Transaction Service tu UI. Ham `proposeSafeTransaction` da co typed stub de mo rong.
- Chua ky Safe transaction that bang Protocol Kit + Transaction Service. Ham `signSafeTransaction` hien tra ve thong bao prepared integration, khong fake thanh cong.
- Fallback demo chi phuc vu Testnet/demo va duoc gan nhan **Testnet demo fallback** trong UI.
- Neu Safe API bi chan CORS, mat mang, hoac chain khong duoc cau hinh, UI se hien fallback thay vi crash.

## Script demo 3 phut cho giang vien

1. Mo WebSafeExchange va ket noi MetaMask bang EOA demo.
2. Vao menu **Safe Control** hoac mo truc tiep `/safe-control`.
3. Giai thich diem moi: "Truoc day em phai roi app sang Safe official dashboard. Bay gio em xem duoc Safe lien quan den EOA ngay trong WebSafeExchange."
4. O tab **Safes**, chon mot Safe trong danh sach. Chi ra network, Safe address, owner list, threshold, nonce, balance va trang thai vi dang ket noi co phai owner hay khong.
5. Mo phan **Pending Safe transactions**. Chi ra safeTxHash, destination, value, nonce, so chu ky hien co va so chu ky can thiet.
6. Bam **Sign in app**. Neu chua cau hinh ky that, giai thich day la integration point da chuan bi san va ung dung khong fake giao dich thanh cong.
7. Sang tab **Create config**, nhap 2 owner address, threshold 2, label demo. Bam **Prepare configuration** va giai thich module validate cau hinh Safe ngay trong app.
8. Ket luan: Safe official dashboard van co link backup, nhung luong demo chinh khong con phai roi WebSafeExchange.
