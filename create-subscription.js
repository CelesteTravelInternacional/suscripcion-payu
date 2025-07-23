
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { fullName, email, cardNumber, expMonth, expYear, cvv, document } = req.body;

    // 1. Crear token
    const tokenResponse = await fetch("https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        language: "es",
        command: "CREATE_TOKEN",
        merchant: {
          apiKey: process.env.API_KEY,
          apiLogin: process.env.API_LOGIN
        },
        creditCardToken: {
          payerId: email,
          name: fullName,
          identificationNumber: document || "0000000000",
          paymentMethod: "VISA",
          number: cardNumber,
          expirationDate: expYear + "/" + expMonth
        }
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.creditCardToken?.creditCardTokenId) {
      return res.status(400).json({ error: "Error creando token", details: tokenData });
    }

    const tokenId = tokenData.creditCardToken.creditCardTokenId;

    // 2. Crear suscripción
    const subscriptionResponse = await fetch("https://sandbox.api.payulatam.com/payments-api/rest/v4.9/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Basic " + Buffer.from(`${process.env.API_LOGIN}:${process.env.API_KEY}`).toString("base64")
      },
      body: JSON.stringify({
        plan: {
          planCode: "CLUB_VIAJEROS_GOLD_SILVER_CTI",
          description: "Suscripción mensual CLUB VIAJEROS GOLD SILVER CTI",
          accountId: process.env.ACCOUNT_ID,
          interval: "MONTH",
          intervalCount: 1,
          paymentAttemptsDelay: 1,
          maxPaymentAttempts: 3,
          maxPendingPayments: 1,
          trialDays: 0,
          additionalValues: [
            { name: "PLAN_VALUE", value: "17850", currency: "COP" }
          ]
        },
        customer: {
          fullName: fullName,
          email: email,
          creditCards: [
            {
              token: tokenId,
              paymentMethod: "VISA"
            }
          ]
        }
      })
    });

    const subscriptionData = await subscriptionResponse.json();
    return res.status(200).json(subscriptionData);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
