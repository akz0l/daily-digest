# ADR-003: Envío de correos — Lambda directo a SES vs SNS fanout

**Estado:** Aceptado  
**Fecha:** 2026-06-05

## Contexto

En `sendDigestMail` tengo que mandar un correo diario a todos los subscribers activos. EventBridge dispara el proceso a las 9:00 AM (hora de Panamá), leo los subscribers en DynamoDB, genero el digest con Claude y lo envío por SES.

La duda era si la Lambda llama a SES directo o si publico en SNS y dejo que otra Lambda mande un correo por subscriber.

## Decisión

**Lambda directo a SES.** Un solo proceso itera la lista y envía.

## Por qué no SNS fanout (por ahora)

Tengo un tope de **15 subscribers por mes**. Con eso, una Lambda manda los 15 correos en pocos segundos. Meter SNS en el medio no me resuelve nada: no necesito paralelismo masivo ni varios consumers del mismo evento.

SNS fanout tendría sentido con miles de destinatarios o si el mismo evento dispara email + push + webhook. Aquí no es el caso. Solo agregaría más piezas y más sitios donde algo puede fallar, sin beneficio real.

También es más fácil de depurar: un log group, un flujo, un lugar donde mirar si algo salió mal. Con fanout los logs se reparten entre muchas invocaciones y para un proyecto chico (o un solo dev) eso es molesto.

## Si crece el volumen

Si algún día saco el límite de 15 y el número de subscribers se dispara, este diseño hay que revisarlo. Probablemente ahí sí valga fanout o alguna cola. Por ahora no me preocupo.

## SNS sí lo uso — pero para otra cosa

Para bounces y complaints de SES:

```
SES (bounce / complaint) → SNS → Lambda → marco el subscriber como inválido en DynamoDB
```

Eso sí lo quiero desacoplado del envío diario. Protege la reputación del sender sin mezclarlo con el flujo principal.

## Lo que descarté

- **SNS → SES sin Lambda:** SES no es subscriber nativo de SNS para mandar correos; igual terminas en Lambda.
- **SQS + consumer:** backpressure y retries que no necesito con 15 subscribers.
- **SendGrid / Mailchimp:** dependencia de pago, menos control, y pierdo el punto del proyecto como portfolio en AWS.
