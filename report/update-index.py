# Mở build/raw.docx bằng LibreOffice (không giao diện), cập nhật mục lục, danh mục bảng, danh mục hình,
# rồi lưu thành BCTN_NguyenMinhTuyen_nhap.docx và bản PDF để xem thử.
# Chạy bằng Python đi kèm LibreOffice:
#   "C:/Program Files/LibreOffice/program/python.exe" report/update-index.py
import os
import subprocess
import sys
import time

import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.connection import NoConnectException

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'build', 'raw.docx')
OUT = os.path.join(HERE, 'BCTN_NguyenMinhTuyen_nhap.docx')
PDF = os.path.join(HERE, 'build', 'BCTN_NguyenMinhTuyen_nhap.pdf')
SOFFICE = os.path.join(os.path.dirname(os.path.abspath(uno.__file__)), 'soffice.exe')
if not os.path.exists(SOFFICE):
    SOFFICE = r'C:\Program Files\LibreOffice\program\soffice.exe'
PORT = 2083


def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


profile = uno.systemPathToFileUrl(os.path.join(HERE, 'build', 'lo-profile'))
proc = subprocess.Popen([SOFFICE, '--headless', '--invisible', '--norestore', '--nologo',
                         f'-env:UserInstallation={profile}',
                         f'--accept=socket,host=127.0.0.1,port={PORT};urp;'])
try:
    resolver = uno.getComponentContext().ServiceManager.createInstanceWithContext(
        'com.sun.star.bridge.UnoUrlResolver', uno.getComponentContext())
    for _ in range(60):
        try:
            ctx = resolver.resolve(f'uno:socket,host=127.0.0.1,port={PORT};urp;StarOffice.ComponentContext')
            break
        except NoConnectException:
            time.sleep(1)
    else:
        raise SystemExit('Không kết nối được LibreOffice')

    desktop = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
    doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(RAW), '_blank', 0, (prop('Hidden', True),))
    indexes = doc.getDocumentIndexes()
    # cập nhật hai lần: lần đầu chèn nội dung làm dời trang, lần sau sửa lại số trang
    for _ in range(2):
        for i in range(indexes.getCount()):
            indexes.getByIndex(i).update()
        doc.refresh()
    doc.storeToURL(uno.systemPathToFileUrl(OUT), (prop('FilterName', 'MS Word 2007 XML'),))
    doc.storeToURL(uno.systemPathToFileUrl(PDF), (prop('FilterName', 'writer_pdf_Export'),))
    print(f'Đã cập nhật {indexes.getCount()} mục lục/danh mục -> {OUT}')
    doc.close(True)
    try:
        desktop.terminate()
    except Exception:
        pass
finally:
    time.sleep(1)
    proc.kill()
