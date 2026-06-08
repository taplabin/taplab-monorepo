(Always follow this sequence or else you're fucked)
List and sequence of commands :-

1) Data Aquisition :- 

- Clients should Agree on a recurring price for subscription. Note down the recurring price.

- Client should agree on the billing cycle i.e. Per month or Per year.  (Needed for cloud/maintainence)

- Collect data from your client. Take pictures of their menu or whatever else. Or take illustrations from Pinterest that they like. Keep ready 2-3 PNGs or JPGs. (Needed for development)

- Take their email as well. (Needed for their CMS login)

2) For a new business we have to scaffold a project (Go to the root of the monorepo)

General Formula :- 
node scripts/new-page.js slug_name "Business Name"

Example :-
node scripts/new-page.js thegluck "THE GLÜCK"

This creates the new project. For every new business webpage, we create a new project... You cannot push this on the monorepo because it is gitignored. That keeps the monorepo light. It stays on your PC.

3) This is a must. Install dependencies -

cd pages/slug_name

npm install

4) To position your development :-

- Go to claude on your browser.

- Give all sample images that you collected in step 1. Also attach TAPLAB_PROMPT.md file from project root. And write in the input box "slug name=whatever, Business name=whatever" 
This is your prompt to Claude. Hit send.

- Claude will give you App.tsx and content.ts

- Paste those in the newly scaffolded project in src folder.

5) Development :-

- Ask customers for their requirements.

- Make changes in the style tag of App.tsx to get the desired output.

To check locally -
 
cd pages/slug_name

npm run dev

- Important Step :- Show customers the local output and get their approval before moving to the next steps. Keeps things clean.

6) To build the project - 

cd pages/slug_name

npm run build
(Side note :- Don't run this in the template project)

- This creates the JS bundle in dist which goes to the bucket on the cloud.

- Also creates App.js and content.js in src. And deploy.js in script. That's why don't run this in template. Or else those files will be in every subsequent new project for a new client

- Again check locally. npm run dev. Same output. All good.

7) Post Development (Agreed design)

- Go to admin.taplab.in
- Add new business 
- respective slug name and business.
- email that you took in step 1
- Price and billing cycle that you agreed in step 1
- Hit create. This creates their firestore doc which is needed for deployment.

- You'll get 2 links :-
1) Customer Razorpay subscription
2) Their CMS portal login where they can edit the contents of the page and more

- Send both these to them on WhatsApp or Email

8) Deployment (final step) -

cd pages/slug_name

General formula :-
npm run deploy --slug=slug_name

Example :-
npm run deploy --slug=thegluck