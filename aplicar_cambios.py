#!/usr/bin/env python3
"""
aplicar_cambios.py — Prepara index.html para las integraciones.

Qué hace (cada paso se puede repetir sin problema; si ya está hecho, lo omite):
  1. Enlaza js/forms.js antes de js/script.js.
  2. Quita el campo oculto "redirect" del formulario (ya no se recarga la página).
  3. Convierte el correo en enlace mailto: y el teléfono en enlace tel:.
  4. Instala Google Tag Manager (solo si se indica el ID con --gtm).

Uso (desde la carpeta raíz del proyecto, donde está index.html):
  python aplicar_cambios.py                    -> pasos 1, 2 y 3
  python aplicar_cambios.py --gtm GTM-ABC1234  -> pasos 1, 2, 3 y 4

Para deshacer todo: git checkout index.html
"""
import argparse
import re
import sys
from pathlib import Path

TEL_TEXT = "+57 300 123 4567"
TEL_HREF = "tel:+573001234567"
EMAIL = "contacto@decopared.com"


def gtm_head(gtm_id, nl):
    return nl.join([
        "<!-- Google Tag Manager -->",
        "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':",
        "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],",
        "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=",
        "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);",
        "})(window,document,'script','dataLayer','%s');</script>" % gtm_id,
        "<!-- End Google Tag Manager -->",
    ])


def gtm_body(gtm_id, nl):
    return nl.join([
        "<!-- Google Tag Manager (noscript) -->",
        '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=%s"' % gtm_id,
        'height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>',
        "<!-- End Google Tag Manager (noscript) -->",
    ])


def main():
    parser = argparse.ArgumentParser(description="Prepara index.html para las integraciones.")
    parser.add_argument("--gtm", help="ID del contenedor de GTM, por ejemplo GTM-ABC1234")
    parser.add_argument("--ruta", default="index.html", help="Ruta del index.html (por defecto: index.html)")
    args = parser.parse_args()

    path = Path(args.ruta)
    if not path.exists():
        sys.exit("No encuentro %s. Ejecuta el script desde la carpeta raíz del proyecto." % path)

    if args.gtm and not re.fullmatch(r"GTM-[A-Z0-9]{4,}", args.gtm):
        sys.exit("El ID de GTM no parece válido (debe verse como GTM-ABC1234).")

    with open(path, "r", encoding="utf-8", newline="") as fh:
        html = fh.read()
    nl = "\r\n" if "\r\n" in html else "\n"
    original = html
    avisos = []

    # 1) Enlazar forms.js antes de script.js ---------------------------------
    if "js/forms.js" in html:
        print("[1] forms.js: ya estaba enlazado.")
    else:
        pattern = re.compile(r'([ \t]*)<script src="js/script\.js"></script>')
        match = pattern.search(html)
        if not match:
            avisos.append('[1] No encontré <script src="js/script.js">. Agrega a mano: <script src="js/forms.js"></script> justo antes.')
        else:
            indent = match.group(1)
            html = pattern.sub(
                lambda m: '%s<script src="js/forms.js"></script>%s%s<script src="js/script.js"></script>' % (indent, nl, indent),
                html, count=1)
            print("[1] forms.js: enlazado antes de script.js.")

    # 2) Quitar el campo oculto redirect --------------------------------------
    redirect_re = re.compile(r'[ \t]*<input type="hidden" name="redirect"[^>]*>[ \t]*\r?\n?')
    if redirect_re.search(html):
        html = redirect_re.sub("", html, count=1)
        print("[2] Campo 'redirect': eliminado.")
    else:
        print("[2] Campo 'redirect': ya no estaba.")

    # 3) Correo -> mailto, teléfono -> tel -------------------------------------
    email_re = re.compile(r'<a href="#"([^>]*)>(' + re.escape(EMAIL) + r')</a>')
    n_email = len(email_re.findall(html))
    if n_email:
        html = email_re.sub(lambda m: '<a href="mailto:%s"%s>%s</a>' % (EMAIL, m.group(1), m.group(2)), html)
    print("[3] Correo: %d enlace(s) convertidos a mailto:." % n_email)

    # (?<!none">) evita volver a envolver un teléfono que ya es un enlace
    tel_re = re.compile(r'(?<!none">)(?<!' + re.escape(TEL_HREF) + r'">)(?<=>)' + re.escape(TEL_TEXT) + r'(?=<)')
    n_tel = len(tel_re.findall(html))
    if n_tel:
        html = tel_re.sub(
            '<a href="%s" class="text-reset text-decoration-none">%s</a>' % (TEL_HREF, TEL_TEXT), html)
    print("[3] Teléfono: %d número(s) convertidos a tel:." % n_tel)

    # 4) Google Tag Manager -----------------------------------------------------
    if "googletagmanager.com/gtm.js" in html:
        print("[4] GTM: ya estaba instalado (no se toca).")
    elif not args.gtm:
        avisos.append("[4] GTM: falta el ID. Cuando esté creado el contenedor, ejecuta: python aplicar_cambios.py --gtm GTM-XXXXXXX")
    else:
        head_re = re.compile(r"<head>")
        body_re = re.compile(r"<body[^>]*>")
        if not head_re.search(html) or not body_re.search(html):
            avisos.append("[4] No encontré <head> o <body>. Pega el snippet de GTM a mano.")
        else:
            html = head_re.sub(lambda m: "<head>" + nl + gtm_head(args.gtm, nl), html, count=1)
            html = body_re.sub(lambda m: m.group(0) + nl + gtm_body(args.gtm, nl), html, count=1)
            print("[4] GTM: instalado con el ID %s." % args.gtm)

    if html != original:
        with open(path, "w", encoding="utf-8", newline="") as fh:
            fh.write(html)
        print("\nListo: %s actualizado." % path)
    else:
        print("\nNo hubo cambios nuevos en %s." % path)

    for aviso in avisos:
        print("AVISO", aviso)


if __name__ == "__main__":
    main()