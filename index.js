"use strict";
require("dotenv").config();
const Reminder = require("./models/Reminder").default;
const Bot = require("./bot").bot;
const Scenario = require("./lib/Scenario");
const { getFromGoogleApi, getCityFromLatLng } = require("./lib/utils/googleApi");

const {
  dayTimeGenerator,
  timeGenerator,
  formatTimeFromInput
} = require("./lib/utils/generate-midday-schedules");

const scenario1 = new Scenario(Bot, [
  {
    listener: /(.*)comment(.*)prendre(.*)pil(.*)/i,
    actions: [
      {
        type: "say text",
        text:
          "Je peux te donner plein de conseils pour l'aider à bien prendre ta pilule ! Mais commençons par les plus importants :"
      },
      {
        type: "say text",
        text: "💡Pour commencer la première fois la pilule, tu as deux possibilités : " +
          " \n 1️⃣  tu peux la prendre le 1er jour de tes règles " +
          " \n 2️⃣ ou tu peux la prendre à n’importe quel moment de ton cycle "+
          " \n 🚨MAIS tu dois utiliser un préservatif pendant 7j. Après ce délai, tu seras protégée d’une éventuelle grossesse non désirée."
          
      },
      {
        type: "say object",
        text: `⏰ Ensuite, il faut que tu sois régulière : tu devras la prendre tous les jours, plus ou moins à la même heure`,
        quickReplies: ["Ça fait beaucoup 😨", "+ de conseils ! 😍", "Je savais tout 😇"]
      },
    ]
  },
  {
    listener: ["+ de conseils ! 😍"],
    actions: [
      {
        type: "say object",
        text:
          "Je peux t’aider à te rappeler à prendre ta pilule tous les jours ! Finis les oublis ou le stress que ton rappel de téléphone sonne à tue-tête. Je t’enverrai une petite discrétos via Messenger. Ça t’intéresse ? 🤓 #ninja",
        quickReplies: ["Carrément !",	"Non merci !"]
      },
    ]
  },
  {
    listener: ["Carrément !"],
    actions: [
      {
        type: "say text",
        text: "Ok super!"
        
      },
      {
        type: "say object",
        attachment: "image",
        url:"https://media.giphy.com/media/ehmtO0cTEP4Vuesrr2/giphy.gif"
        }
      ,
      {
        type: "say text",
        text: "Pour bien choisir un horaire, je te conseille d’être : " +
        " \n ✅ toujours réveillée à ce moment (c’est quand même + pratique 🤗) " +
        " \n ✅ pas très loin de ton tel (c’est pas le moment d’être à la piscine ou en boîte de nuit 🤓)"+
        " \n ✅ avoir ta pilule à proximité (par exemple le soir, sur ta table de nuit ? 🌙)"
        
      },
      {
        type: "say object",
        text:
          "Alors, à quelle heure je t’envoie un rappel ? 😄",
        quickReplies: ["Team Matin 🐓", "Team Aprèm ☀️", "Team Nuit 🐺"]
      },
    ]
  },
  {
    listener: /Team Matin(.*)|Team Aprèm(.*)|Team Nuit(.*)/i,
    actions: [
      {
        type: "say object",
        text: "À quelle heure ?",
        quickRepliesGenerator: dayTimeGenerator
      }
    ]
  },
  {
    listener: /^[0-9]{1}([0-9]{1})?h$|^Minuit$|^Midi$/i,
    actions: [
      {
        type: "say object",
        text: "Allez, t'as le meme le choix des minutes !",
        quickRepliesGenerator: timeGenerator
      }
    ]
  },
  {
    listener: /^[0-9]{1}([0-9]{1})?h[0-9]{2}$|^Minuit !$|^Midi !$/i,
    callback: async (idUser, reminderTime) => {
      try {
        const foundUser = await Reminder.findOne({
          where: {
            idUser
          }
        });
        if (foundUser) {
          await Reminder.update(
            {
              idUser,
              sequenceStep: 0,
              time: formatTimeFromInput(reminderTime)
            },
            {
              where: {
                idUser
              }
            }
          );
        } else {
          await Reminder.create({
            idUser,
            sequenceStep: 0,
            time: formatTimeFromInput(reminderTime)
          });
        }
      } catch (err) {
        console.error(err);
      }
    },
    actions: [
      {
        type: "say text",
        text:
          "C’est bien noté 📝, je te rappellerai de prendre ta pilule à cette heure-là ! ⏰"
      }
    ]
  },
  {
    type: "on",
    listener: "quick_reply:PIL_REM_DNT_HAVE",
    actions: [
      {
        type: "sendTextMessage",
        text: "Tu as 12h à compter de maintenant pour la prendre, sinon tu ne seras plus protégée (hors pilule Microval) ! 😅",
        quickReplies: [
          {
            "content_type":"text",
            "title":"Ah oui ? 😨",
            "payload":"PIL_REM_PROTEC_DETAILS",
          },
          {
            "content_type":"text",
            "title":"Ok j’y vais 😅",
            "payload":"<HOUR_SET_21H>",
          },
          {
            "content_type":"text",
            "title":"Je m’en fiche",
            "payload":"<HOUR_SET_21H>",
          },
          {
            "content_type":"text",
            "title":"Microval ? 🧐",
            "payload":"<HOUR_SET_21H>",
          }
        ]
      }
    ]
  },
  {
    type: "on",
    listener: "quick_reply:PIL_REM_PROTEC_DETAILS",
    actions: [
      {
        type: "say text",
        text:
          "Oui ! La pilule te protège 36h des grossesses non désirées. Au-delà de ce délai, l’efficacité de la pilule est moindre ! 👼😅"
      },
      {
        type: "say text",
        text:
          "La pilule Microval fait exception à la règle ! Attention, avec celle-ci tu n’as que 3h pour prendre ton contraceptif 🏃‍♀️"
      },
      {
        type: "sendTextMessage",
        text: "Si tu te rends compte aujourd’hui que tu as oublié ta pilule hier, tu peux en prendre 2 en même temps. Plus rapidement tu les prendras, mieux ce sera, alors ne tarde pas ! 😊",
        quickReplies: [
          {
            "content_type":"text",
            "title":"Ok c’est noté ! 📝",
            "payload":"PIL_REM_PROTEC_DETAILS_NOTED",
          },
          {
            "content_type":"text",
            "title":"Ça fait flipper… 😅",
            "payload":"<HOUR_SET_21H>",
          },
        ]
      }
    ]
  },
  {
    type: "on",
    listener: "quick_reply:PIL_REM_PROTEC_DETAILS_NOTED",
    actions: [
      {
        type: "sendTextMessage",
        text: "Au fait, tu es bientôt arrivée à la fin de ta plaquette ! Tu as une ordonnance à jour ?",
        quickReplies: [
          {
            "content_type":"text",
            "title":"Oui",
            "payload":"<HOUR_SET_21H>",
          },
          {
            "content_type":"text",
            "title":"Non",
            "payload":"ORDO_NO_MORE",
          },
        ]
      }
    ]
  },
  {
    listener: "test loc",
    actions: [
      {
        type: "sendTextMessage",
        text: "Ok! Je peux te chercher un.e gynécologue 👩‍⚕️👨‍⚕️! J'ai besoin de ton adresse stp",
        quickReplies: [
          {
            "content_type":"text",
            "title":"C'est mort 💀",
            "payload":"<HOUR_SET_21H>",
          },
          {
            "content_type":"location",
            "title":"Géolocalise-moi !"
          }
        ]
      }
    ]
  },
]);

Bot.on('attachment', async (payload, chat) => {
  const coord = payload.message.attachments[0].payload.coordinates;
  const city = await getCityFromLatLng(coord);
  chat.say(`https://www.doctolib.fr/gynecologue/${city}?latitude=${coord.lat}&longitude=${coord.long}`);
});

scenario1.playScenario();

Bot.start(process.env.PORT);
