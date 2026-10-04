### Which Whip

I would like to create a platform to help my dad decide on a used car to buy. This is for a hackathon project
Currently he sends my facebook marketplace urls of cars he thinks are "decent" and then asks me for my opinion.
I would like to replace this process with a tool that can take in the the users preferences as what they think is a good car


There are a few components to this

1. The car data input

Somehow get the car's data that is meant to be rated.
This can initally be a form but much more ideally you paste in a link of a fb market place posting and it can scrape.

2. User preferences
This is where the use can set their preferences for how they want a car to be evaluated. For now this can just be a stateful thing within broswer cookies.

What should be factored inputs (all optional since they are not gaunateed to be available)
- Milage
- Reported Damanges
_ MPG
- Brand reliablilty
- Engine reliability
- What they are looing to use it for
    - Family, trips, daily, etc. This can have either strucutred multi selections or text input
- Cost over life
    - Since this is a used car this is defined as [buying price (from some listing) - selling preice (after x years of use)] / [Years of use] . This give as cost over time and can then be comparable to a leasing offer of $x dollars month/
    - This would be without factoring insurance, changing tires, or any other cost that would apply regardless of the car chosen
    - Gas cost could be factored given there is an MPG

The things I want to consider are milage, reported dameges, MPG, the reliability of the brand, the reliabitly of the engine, the style of car (van for family etc).

3. Evaluator
After these have been put in, it should be able to decide whether the car is good ro not.
It takes in the preferences, reads the car data, gives a rating. This is on simple scale of 1 -10.

4. Rankings

Past evaluations should be referenceable (on a seperate page)


### Views

1. Preferences portal

2. Car input portal
- Include an option, fill by link

3. Previous rankings portal



### What we are not doing
Creating a login flow or any sort of Authentication


### tech stack
Browser base / broswer use / selentium - scraping the post data
Gemini API 
- For research based questions (what people say about the car in gernal)
- Collect this data as part things for decigiond
Jev for deciding the ratings https://console.typesafe.ai/home
- used after reasoning is done. this is the deciding part.

Nextjs for full stack



