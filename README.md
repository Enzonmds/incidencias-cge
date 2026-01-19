# Sistema de Gestión de Incidencias - Full Stack Containerized

> **Infraestructura como Código:** Despliegue automatizado de aplicación PERN (Postgres, Express, React, Node) utilizando Docker y Docker Compose.

Este proyecto no es solo una aplicación de gestión; es una demostración práctica de orquestación de servicios y modernización de aplicaciones monolíticas a microservicios contenerizados.

## 🏗 Arquitectura & Stack Tecnológico

El sistema se ejecuta sobre 3 contenedores aislados que se comunican a través de una red interna de Docker:

* **Frontend Container:** React + Vite (Node alpine).
* **Backend Container:** Node.js + Express (API RESTful con gestión de procesos).
* **Database Container:** PostgreSQL (Persistencia de datos con volúmenes dockerizados).

## 🚀 Quick Start (Despliegue en 2 minutos)

No necesitas instalar Node, ni Postgres, ni configurar variables de entorno locales. Todo corre dentro de Docker.

### Prerrequisitos
* Docker & Docker Compose instalados.

### Instalación y Ejecución

1.  **Clonar y configurar entorno:**
    ```bash
    git clone <TU_URL_DEL_REPO>
    cd incidencias-cge
    cp .env.example .env
    ```

2.  **Desplegar la infraestructura:**
    ```bash
    docker-compose up --build -d
    ```
    *El flag `--build` asegura que las imágenes se construyan desde cero. `-d` lo ejecuta en segundo plano.*

3.  **Acceder al sistema:**
    * **Frontend:** http://localhost:5174
    * **Backend API:** http://localhost:3001
    * **Postgres Database:** Puerto 5433 expuesto.

## 🛠 Comandos de Mantenimiento

* **Ver logs en tiempo real:**
    ```bash
    docker-compose logs -f
    ```
* **Detener la infraestructura:**
    ```bash
    docker-compose down
    ```

---
*Desarrollado por Enzo Moreira - SysAdmin