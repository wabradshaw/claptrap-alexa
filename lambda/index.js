const Alexa = require('ask-sdk-core');
const Request = require('request-promise');

const url = "https://claptrapapp.com/service/";

const goodRatingTemplates = [
	"Thank you, I'm glad you liked it.",
	"Thanks, good to hear.",
	"You liked it? Great!",
	"Excellent, thanks for the feedback."
];

const badRatingTemplates = [
	"Thank you, I'll try to do better next time.",
	"Oh no! Thanks for letting me know.",
	"Sorry! Thanks for the feedback.",
	"Sorry about that."
];

function describeFrom(templates, endSession, handlerInput){
	var template = templates[Math.floor(Math.random() * templates.length)];
	
	return handlerInput.responseBuilder
      .speak(template)
      .reprompt(template)
      .withSimpleCard('Claptrap', template)
	  .withShouldEndSession(endSession)
      .getResponse();
};

function getJoke(){
	return Request({
		url: url + "joke",
		json: true
	});
}

function tellJoke(joke, handlerInput){
	var spokenPunchline = '<prosody rate="65%">' 
						+ joke.punchline.replace(joke.linguisticReplacement, '<prosody volume="loud">' + joke.linguisticReplacement + '</prosody>') 
						+ "</prosody>";
	var spokenJoke = joke.setup + '<break strength="x-strong"/>' + spokenPunchline;
	var writtenJoke = joke.setup + '\n ' + joke.punchline;	
	
    handlerInput.attributesManager.setSessionAttributes(joke);
		  
	return handlerInput.responseBuilder
      .speak(spokenJoke)
      .reprompt(spokenJoke)
      .withSimpleCard('Claptrap', writtenJoke)
	  .withShouldEndSession(false)
      .getResponse();
}

function rateJoke(vote, spec, handlerInput){
	var id = handlerInput.requestEnvelope.session.sessionId.slice(-32);
	
	return Request({
		method: 'POST',		
		url: url + "rate/" + id,
		body: {
			vote: vote,
			joke: spec
		},
		json: true
	});
}
	
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the Alexa Skills Kit, you can say hello!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const JokeIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'JokeIntent';
	},
	handle(handlerInput) {
		return getJoke()
			.then(data => tellJoke(data, handlerInput))
	}
};

const GoodIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'GoodIntent';
	},
	handle(handlerInput) {
		var spec = handlerInput.attributesManager.getSessionAttributes();
		
		if(spec.nucleus){
			return rateJoke(1, spec, handlerInput)
				.then(() => describeFrom(goodRatingTemplates, false, handlerInput));
		} else {
			return getJoke()
				.then(data => tellJoke(data, handlerInput))
		}
	}
};

const BadIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'BadIntent';
	},
	handle(handlerInput) {
		var spec = handlerInput.attributesManager.getSessionAttributes();
		
		if(spec.nucleus){
			return rateJoke(-1, spec, handlerInput)
				.then(() => describeFrom(badRatingTemplates, false, handlerInput));
		} else {
			return getJoke()
				.then(data => tellJoke(data, handlerInput))
		}
	}
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    JokeIntentHandler,
	GoodIntentHandler,
	BadIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();