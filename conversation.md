Conversation-

Jan: 

I noticed a conversation-context bug that we need to fix.  
Example:  
1\. Bot: "Hello, I'm.."  
2\. User: "Good afternoon, I'm single and I don't have children."  
3\. Bot responds as if the user had already mentioned being single and childless before, instead of  
treating this as new information from the user's latest message.  
The problem is not simply the wording of the response. The bot is incorrectly treating information  
from the user's current message as if it were already known or previously mentioned in the  
conversation.  
In other words, the system seems to lose the distinction between:  
\- information that was already present in previous messages/memory, and  
\- information that the user has just introduced in the current message.  
The current user message must be treated as NEW information when generating the response. The  
bot should never refer to it as something the user "already said," "mentioned before," or otherwise  
behave as if it had appeared earlier unless it actually exists in an earlier user message.  
Please check the conversation-history construction, especially whether the current user message is  
being inserted into history/memory and then passed again as if it were previous context. Also check  
the order of memory/persona extraction versus response generation.

Ideally the flow should be:  
Previous conversation/history → current user message → generate response → update  
memory/persona with the new information.  
Not:  
Current user message → save/extract as memory → build context → generate response as if that  
information was already known.  
This distinction is important because otherwise the chatbot can appear to repeat or "remember"  
things that the user has literally just said for the first time.

Me:

Jan, Your point makes perfect sense. This is where the bot is loosing its human touch. This much instructions will cost you more token though. 

Jan,  Hope you are doing well. Will you provide any more docs with references? if so, after getting  the full doc, we will refactor the chat scenario flow to your suggested ways. 

Jan: 

So it  
 means if 1 provide you with more examples like that you will just fed ai with them?bc I dont want consumption/ token usage to go up

Me:

We will try to extract the behavior of these conversation and will try to implement your proposed way/flow of talk. We will not feed the direct conversations to the bot.  Keep in mind that your proposed flow includes adding up new memory after each text for that user. 

one line memory \- 5 tokens 

two line memory 10 tokens and it will rise as the conversation grows.  We can restrict the bot to re-read limited history though.

If you dont want to raise the token cost its better we only implement the behavior and  the flow instructions only.

Jan: 

Yes, it is important to me that the token cost does not increase. So I would prefer implementing the behavior and conversation flow through instructions only, without adding new memory after every message.

Me:   
Understood, Jan.  
We'll use instructions only to improve the bot's behavior and conversation flow,  
Without adding new memory after each message, so the token cost stays low.

Jan:   
The main problem is not only grammar, but also unnatural phrasing and incorrect word/preposition  
choices.  
In many cases the sentence is understandable, but a native Slovenian speaker would phrase it  
differently. I've collected several examples where I show the bot's original sentence and my  
corrected version.

Me: 

Most LLMs are still not fully native-ready for many languages, including Slovenian. We’re working on improving this and hope to share the final version with all flow instructions by Saturday.

We can also add sentence validation, but that would require additional LLM calls and increase token costs. So it’s essentially a balance between **quality and cost**.

Jan:  
How much increase of tokens approximately?

Me: 10-15% extra atleast. We need to do a test on that before providing any exact value. 

Jan:

That is ok if the result will be satisfying

Me:

We will provide you an update after testing. 