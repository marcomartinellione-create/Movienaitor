# -*- coding: utf-8 -*-
"""Genera i QR del manuale e li scrive dentro Manuale.html.

I QR non sono immagini ma un tracciato SVG dentro il blob JSON del manuale: niente
file esterni da tenere accanto, e restano nitidi a qualsiasi dimensione.

    python strumenti/qr.py                          rigenera i QR con gli URL qui sotto
    python strumenti/qr.py youtube https://…        cambia l'URL di YouTube e lo genera

Serve il modulo `qrcode` (pip install qrcode). Dopo averlo lanciato, ricordarsi che le
copie dentro le build si rifanno da sole: electron/copia-html.js e
app-mobile/scripts/copia-manuale.js ripescano Manuale.html a ogni compilazione.
"""
import io
import json
import os
import re
import sys

import qrcode

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANUALE = os.path.join(RADICE, 'Manuale.html')

# Gli URL dei riquadri in apertura del manuale. `None` = segnaposto: il riquadro resta,
# senza QR, con la sua etichetta «in arrivo» — meglio di un codice che porta altrove.
COLLEGAMENTI = [
    {'id': 'github',  'etichetta': 'Il progetto su GitHub',
     'nota': 'Codice, versioni da scaricare e novità di ogni aggiornamento.',
     'url': 'https://github.com/marcomartinellione-create/Movienaitor'},
    {'id': 'youtube', 'etichetta': 'Video tutorial',
     'nota': 'Una panoramica in video di come si usa.',
     'url': None},
]


def tracciato(url):
    """Il QR come singolo <path> SVG: una corsa orizzontale per ogni fila di moduli."""
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=1, border=0)
    q.add_data(url)
    q.make(fit=True)
    m = q.get_matrix()
    pezzi = []
    for y, riga in enumerate(m):
        x = 0
        while x < len(riga):
            if riga[x]:
                x0 = x
                while x < len(riga) and riga[x]:
                    x += 1
                pezzi.append('M%d %dh%dv1h-%dz' % (x0, y, x - x0, x - x0))
            else:
                x += 1
    return {'moduli': len(m), 'd': ''.join(pezzi)}


def blob(testo):
    """Il blob JSON dentro Manuale.html, con gli indici per riscriverlo al suo posto."""
    apri = '<script type="application/json" id="dati">\n'
    i0 = testo.index(apri) + len(apri)
    i1 = testo.index('</script>', i0) - 1
    return json.loads(testo[i0:i1]), i0, i1


def scrivi(testo, dati, i0, i1):
    # Come fa il manuale stesso quando si risalva: '<' diventa < per non chiudere
    # per sbaglio lo <script> che lo contiene. '>' resta letterale.
    nuovo = json.dumps(dati, ensure_ascii=False, indent=1).replace('<', '\\u003c')
    return testo[:i0] + nuovo + testo[i1:]


def main():
    if len(sys.argv) == 3:
        quale, url = sys.argv[1], sys.argv[2]
        for c in COLLEGAMENTI:
            if c['id'] == quale:
                c['url'] = url
                break
        else:
            sys.exit('Non conosco il collegamento "%s": %s' %
                     (quale, ', '.join(c['id'] for c in COLLEGAMENTI)))

    testo = io.open(MANUALE, encoding='utf-8', newline='').read()
    crlf = '\r\n' in testo
    testo = testo.replace('\r\n', '\n')
    dati, i0, i1 = blob(testo)

    fuori = []
    for c in COLLEGAMENTI:
        voce = {'etichetta': c['etichetta'], 'nota': c['nota'], 'url': c['url']}
        if c['url']:
            voce.update(tracciato(c['url']))
            print('%-8s %s (%d moduli)' % (c['id'], c['url'], voce['moduli']))
        else:
            print('%-8s segnaposto: nessun QR finche\' non c\'e\' l\'indirizzo' % c['id'])
        fuori.append(voce)

    dati['collegamenti'] = fuori
    testo = scrivi(testo, dati, i0, i1)
    io.open(MANUALE, 'w', encoding='utf-8', newline='\r\n' if crlf else '\n').write(testo)
    print('Manuale.html aggiornato')


if __name__ == '__main__':
    main()
