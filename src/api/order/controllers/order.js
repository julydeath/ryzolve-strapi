"use strict";
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// const stripe = require("stripe")(
//   "pk_live_51IZKCmJZWHNdQWQL8OnhcYNkF2fmAxB3qzL4PmgxxvpJZWDEW6jFXHp8yCyv2QFOhBVQw0Xpjhql774TZde44qfm00JnGm23NB"
// );

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    // @ts-ignore

    // retrieve item information
    const { products, username, email, discount, user } = ctx.request.body;
    try {
      const randomNumber = Math.floor(100000 + Math.random() * 900000);
      const lineItems = products.map((product) => {
        const totalAmount = product.price - (discount / 100) * product.price;

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        };
      });

      const metadata = {
        email: user.email,
        agency: user.agency,
        city: user.city,
        randomNumber: randomNumber,
      };

      // create a stripe session
      const session = await stripe.checkout.sessions.create({
        customer_email: email,
        mode: "payment",
        success_url:
          process.env.CLIENT_URL +
          `/purchase-completed?success='true'&username=${username}`,
        cancel_url: process.env.CLIENT_URL + "/checkout",
        line_items: lineItems,
        metadata: metadata,
        payment_intent_data: {
          metadata: metadata,
        },
      });

      console.log({ session });

      // create the item
      await strapi.service("api::order.order").create({
        data: {
          username,
          products,
          stripeSessionToken: session.id,
          stripeRandomNumber: randomNumber,
          user: {
            connect: [user.id],
          },
        },
      });

      return { id: session.id };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));
