import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Términos de uso — Daily Tech News",
  description: "Términos de uso del servicio Daily Tech News.",
};

export default function TerminosDeUsoPage() {
  return (
    <LegalPageLayout title="Términos de uso" lastUpdated="5 de junio de 2026">
      <p>
        Al registrarte en Daily Tech News, aceptas los siguientes términos de uso.
        Si no estás de acuerdo con ellos, no utilices el servicio.
      </p>

      <section>
        <h2>1. Descripción del servicio</h2>
        <p>
          Daily Tech News es un servicio de suscripción por correo electrónico que
          envía un resumen diario de noticias tecnológicas según los temas que
          elijas (Cloud, IA, Ciberseguridad, Development u otros disponibles).
        </p>
      </section>

      <section>
        <h2>2. Almacenamiento de tu correo electrónico</h2>
        <p>
          Al completar el registro, aceptas expresamente que tu dirección de
          correo electrónico será almacenada en nuestros sistemas con el fin de
          gestionar tu suscripción, enviarte el código de verificación y
          remitirte los correos del servicio.
        </p>
        <p>
          También guardamos los temas de interés que selecciones para
          personalizar el contenido que recibes.
        </p>
      </section>

      <section>
        <h2>3. Uso del servicio</h2>
        <ul>
          <li>Debes proporcionar una dirección de correo válida y verificarla mediante el código OTP.</li>
          <li>Te comprometes a no utilizar el servicio con fines ilícitos o para suplantar a otra persona.</li>
          <li>Nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos términos.</li>
        </ul>
      </section>

      <section>
        <h2>4. Cancelación de la suscripción</h2>
        <p>
          Puedes cancelar tu suscripción en cualquier momento. Una vez cancelada,
          dejaremos de enviarte correos y procederemos a eliminar o anonimizar tus
          datos conforme a nuestra{" "}
          <Link href="/politica-de-privacidad">Política de privacidad</Link>.
        </p>
      </section>

      <section>
        <h2>5. Modificaciones</h2>
        <p>
          Podemos actualizar estos términos ocasionalmente. Los cambios relevantes
          se comunicarán a través del servicio o por correo electrónico. El uso
          continuado del servicio tras dichos cambios implica tu aceptación.
        </p>
      </section>

      <section>
        <h2>6. Contacto</h2>
        <p>
          Si tienes preguntas sobre estos términos, puedes contactarnos a través
          de los canales indicados en el sitio web.
        </p>
      </section>
    </LegalPageLayout>
  );
}
