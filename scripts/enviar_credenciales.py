#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de automatización para el envío de credenciales del Sistema de Gestión Política (SGP).
Permite modo de simulación (--dry-run) y envío de prueba individual (--test-email).

Uso:
  1. Simulación en consola (sin enviar correos):
     python scripts/enviar_credenciales.py --dry-run

  2. Envío de prueba a tu propio correo:
     python scripts/enviar_credenciales.py --test-email tu_correo@gmail.com --smtp-user emisor@gmail.com --smtp-pass "tu_app_password"

  3. Envío masivo a toda la nómina:
     python scripts/enviar_credenciales.py --smtp-user emisor@gmail.com --smtp-pass "tu_app_password"
"""

import csv
import smtplib
import argparse
import sys
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def generar_html_correo(nombre, email, password, rol, zona, url):
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido al Sistema de Gestión Política (SGP)</title>
      <style>
        body {{
          background-color: #0b0f19;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #f8fafc;
        }}
        .container {{
          max-width: 600px;
          margin: 0 auto;
          background-color: #1e293b;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #334155;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }}
        .header {{
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          padding: 30px 25px;
          text-align: center;
        }}
        .header h1 {{
          margin: 0;
          font-size: 24px;
          color: #ffffff;
          font-weight: 800;
          letter-spacing: -0.5px;
        }}
        .header p {{
          margin: 6px 0 0 0;
          font-size: 14px;
          color: #dbeafe;
        }}
        .content {{
          padding: 30px 25px;
        }}
        .greeting {{
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 12px;
        }}
        .intro-text {{
          font-size: 15px;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 24px;
        }}
        .credentials-card {{
          background-color: #0f172a;
          border: 1px solid #475569;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 26px;
        }}
        .cred-item {{
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #1e293b;
          font-size: 14px;
        }}
        .cred-item:last-child {{
          border-bottom: none;
        }}
        .cred-label {{
          color: #94a3b8;
          font-weight: 600;
        }}
        .cred-value {{
          color: #f8fafc;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-weight: 700;
        }}
        .password-value {{
          color: #38bdf8;
          background-color: #082f49;
          padding: 2px 8px;
          border-radius: 6px;
        }}
        .btn-wrapper {{
          text-align: center;
          margin: 30px 0;
        }}
        .btn-login {{
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          display: inline-block;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
        }}
        .instructions {{
          background-color: #172554;
          border-left: 4px solid #3b82f6;
          padding: 14px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 24px;
        }}
        .instructions p {{
          margin: 0;
          font-size: 13px;
          color: #bfdbfe;
          line-height: 1.5;
        }}
        .footer {{
          text-align: center;
          padding: 20px;
          background-color: #0f172a;
          border-top: 1px solid #334155;
          font-size: 12px;
          color: #64748b;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SGP — Sistema de Gestión Política</h1>
          <p>Módulo Oficial de Gestión de Pedidos y Demandas Ciudadanas</p>
        </div>
        
        <div class="content">
          <div class="greeting">¡Hola, {nombre}!</div>
          <div class="intro-text">
            Te damos la bienvenida al <strong>Sistema de Gestión Política (SGP)</strong>. A continuación, encontrarás tus datos de acceso oficiales para ingresar a la plataforma y gestionar las solicitudes de tu área asignada.
          </div>
          
          <div class="credentials-card">
            <div class="cred-item">
              <span class="cred-label">Rol Asignado:</span>
              <span class="cred-value">{rol}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Zona / Asignación:</span>
              <span class="cred-value">{zona}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Correo (Usuario):</span>
              <span class="cred-value">{email}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Contraseña de Acceso:</span>
              <span class="cred-value password-value">{password}</span>
            </div>
          </div>
          
          <div class="instructions">
            <p><strong>💡 Nota Importante:</strong> El sistema está optimizado para su uso tanto en computadoras de escritorio como desde teléfonos móviles. Si posees más de un rol asignado, el sistema te permitirá elegir en qué perfil ingresar al iniciar sesión.</p>
          </div>
          
          <div class="btn-wrapper">
            <a href="{url}" class="btn-login" target="_blank">Ingresar al Sistema SGP</a>
          </div>
        </div>
        
        <div class="footer">
          Enlace directo a la plataforma: <a href="{url}" style="color: #38bdf8;">{url}</a><br>
          © 2026 Sistema de Gestión Política (SGP). Mensaje institucional confidencial.
        </div>
      </div>
    </body>
    </html>
    """

def main():
    parser = argparse.ArgumentParser(description="Envío masivo de credenciales de acceso para SGP.")
    parser.add_argument("--csv", default="usuarios_credenciales_envio.csv", help="Ruta al archivo CSV con los usuarios")
    parser.add_argument("--dry-run", action="store_true", help="Simulación: muestra el contenido en consola sin enviar correos reales")
    parser.add_argument("--test-email", help="Envía un solo correo de prueba a la dirección indicada")
    parser.add_argument("--smtp-host", default="smtp.gmail.com", help="Servidor SMTP (defecto: smtp.gmail.com)")
    parser.add_argument("--smtp-port", type=int, default=587, help="Puerto SMTP (defecto: 587 con STARTTLS)")
    parser.add_argument("--smtp-user", help="Usuario/correo emisor para autenticación SMTP")
    parser.add_argument("--smtp-pass", help="Contraseña o Contraseña de Aplicación SMTP")

    args = parser.parse_args()

    # 1. Leer el archivo CSV
    try:
        with open(args.csv, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            usuarios = list(reader)
    except Exception as e:
        print(f"❌ Error al abrir el archivo CSV '{args.csv}': {e}")
        sys.exit(1)

    print(f"📋 Se cargaron {len(usuarios)} usuarios desde {args.csv}")

    # 2. Modo Simulación (DRY-RUN)
    if args.dry_run:
        print("\n🧪 --- MODO SIMULACIÓN (DRY-RUN) ACTIVADO ---")
        for u in usuarios:
            print(f"🔹 Destinatario: {u['nombre']} <{u['email']}> | Rol: {u['rol']} | Contraseña: {u['password']}")
        print(f"\n✅ Total simulado: {len(usuarios)} correos preparados correctamente.")
        print("💡 Para enviar correos reales, ejecuta sin --dry-run especificando --smtp-user y --smtp-pass.")
        return

    # 3. Validar credenciales SMTP para envío real
    if not args.smtp_user or not args.smtp_pass:
        print("❌ Error: Para realizar envíos reales debes especificar --smtp-user y --smtp-pass.")
        print("   Ejemplo: python scripts/enviar_credenciales.py --smtp-user tu_correo@gmail.com --smtp-pass 'xxxx xxxx xxxx xxxx'")
        sys.exit(1)

    # 4. Modo Envío de Prueba Individual
    if args.test_email:
        print(f"\n📨 Enviando correo de prueba a: {args.test_email}...")
        u_test = usuarios[0]
        html = generar_html_correo(u_test['nombre'], u_test['email'], u_test['password'], u_test['rol'], u_test['zona'], u_test['url'])
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Acceso Oficial al Sistema de Gestión Política (SGP) [PRUEBA]"
        msg["From"] = f"Sistema SGP <{args.smtp_user}>"
        msg["To"] = args.test_email
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(args.smtp_host, args.smtp_port) as server:
                server.starttls()
                server.login(args.smtp_user, args.smtp_pass)
                server.send_message(msg)
            print(f"✅ ¡Correo de prueba enviado con éxito a {args.test_email}!")
        except Exception as e:
            print(f"❌ Falló el envío de prueba: {e}")
        return

    # 5. Envío Masivo a Toda la Nómina
    confirm = input(f"⚠️ Estás a punto de enviar {len(usuarios)} correos reales a la nómina de usuarios. ¿Deseas continuar? (s/n): ")
    if confirm.lower() != 's':
        print("Operación cancelada por el usuario.")
        return

    enviados = 0
    fallidos = 0

    try:
        print("\n🚀 Conectando al servidor SMTP...")
        with smtplib.SMTP(args.smtp_host, args.smtp_port) as server:
            server.starttls()
            server.login(args.smtp_user, args.smtp_pass)
            print("✅ Autenticación SMTP exitosa. Iniciando envíos...\n")

            for idx, u in enumerate(usuarios, 1):
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "Acceso Oficial al Sistema de Gestión Política (SGP)"
                msg["From"] = f"Sistema SGP <{args.smtp_user}>"
                msg["To"] = u['email']

                html = generar_html_correo(u['nombre'], u['email'], u['password'], u['rol'], u['zona'], u['url'])
                msg.attach(MIMEText(html, "html"))

                try:
                    server.send_message(msg)
                    enviados += 1
                    print(f"[{idx}/{len(usuarios)}] ✅ Enviado a: {u['nombre']} ({u['email']})")
                except Exception as ex:
                    fallidos += 1
                    print(f"[{idx}/{len(usuarios)}] ❌ Error enviando a {u['email']}: {ex}")

                # Pausa de 1 segundo entre envíos para no saturar el servidor SMTP
                time.sleep(1)

    except Exception as e:
        print(f"❌ Error crítico en la conexión SMTP: {e}")
        sys.exit(1)

    print(f"\n========================================================")
    print(f"🏁 Proceso finalizado. Total enviados: {enviados} | Fallidos: {fallidos}")
    print(f"========================================================")

if __name__ == "__main__":
    main()
