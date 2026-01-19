import React from 'react';

const LegalPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Aviso Legal (Provisorio)
                </h2>
                <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-gray-700 space-y-4 text-center">
                    <p>
                        Este es un aviso legal de prueba.
                    </p>
                    <p>
                        El chat es un canal de atención voluntario. Al utilizarlo, usted acepta el procesamiento de sus datos con fines de gestión de incidencias y mejora del servicio.
                    </p>
                    <p>
                        Este texto será reemplazado por la versión oficial proporcionada por el equipo jurídico.
                    </p>
                    <hr className="my-6 border-gray-300" />
                    <p className="text-sm italic text-gray-500">
                        División Sistemas Informáticos - CGE
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
