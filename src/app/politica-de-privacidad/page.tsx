import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Política de privacidad — Daily Tech News",
  description: "Política de privacidad del servicio Daily Tech News.",
};

export default function PoliticaDePrivacidadPage() {
  return (
    <LegalPageLayout title="Política de privacidad" lastUpdated="5 de junio de 2026">
      <p>
        En Daily Tech News nos comprometemos a proteger tu privacidad. Esta
        política describe cómo recopilamos, usamos y protegemos tu información.
      </p>

      <section>
        <h2>1. Datos que recopilamos</h2>
        <p>Al registrarte, recopilamos únicamente la información necesaria para el servicio:</p>
        <ul>
          <li>Tu dirección de correo electrónico.</li>
          <li>Los temas de interés que selecciones.</li>
          <li>Datos técnicos mínimos asociados al proceso de verificación (código OTP temporal).</li>
        </ul>
      </section>

      <section>
        <h2>2. Uso de tu correo electrónico</h2>
        <p>
          <strong>
            No utilizaremos tu correo almacenado para ninguna otra actividad
            distinta a la descrita en este servicio.
          </strong>
        </p>
        <p>Tu correo se utiliza exclusivamente para:</p>
        <ul>
          <li>Enviarte el código de verificación durante el registro.</li>
          <li>Enviarte correos diarios con noticias tecnológicas según los temas que hayas elegido.</li>
          <li>Comunicaciones estrictamente relacionadas con tu suscripción (por ejemplo, confirmación de baja).</li>
        </ul>
        <p>
          No vendemos, alquilamos ni compartimos tu correo con terceros para
          marketing, publicidad ni ningún otro fin comercial ajeno al servicio.
        </p>
      </section>

      <section>
        <h2>3. Almacenamiento y seguridad</h2>
        <p>
          Tu correo y preferencias se almacenan en nuestros sistemas con medidas
          de seguridad razonables para protegerlos contra accesos no autorizados,
          pérdida o alteración.
        </p>
      </section>

      <section>
        <h2>4. Cancelación de la suscripción</h2>
        <p>
          Puedes cancelar tu suscripción en cualquier momento. Tras la
          cancelación:
        </p>
        <ul>
          <li>Dejaremos de enviarte correos con noticias tecnológicas.</li>
          <li>Eliminaremos o anonimizaremos tu correo y datos asociados de nuestros sistemas en un plazo razonable.</li>
        </ul>
      </section>

      <section>
        <h2>5. Tus derechos</h2>
        <p>
          Puedes solicitar el acceso, rectificación o eliminación de tus datos
          personales contactándonos a través de los canales indicados en el sitio
          web.
        </p>
      </section>

      <section>
        <h2>6. Cambios en esta política</h2>
        <p>
          Podemos actualizar esta política ocasionalmente. Publicaremos la versión
          vigente en esta página con la fecha de última actualización. Te
          recomendamos revisarla periódicamente.
        </p>
      </section>

      <section>
        <h2>7. Más información</h2>
        <p>
          Para conocer las condiciones generales del servicio, consulta nuestros{" "}
          <Link href="/terminos-de-uso">Términos de uso</Link>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
