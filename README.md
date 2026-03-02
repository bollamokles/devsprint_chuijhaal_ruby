# devsprint_chuijhaal_ruby
Project: IUT Cafteria ramadan order management service
  
           Conducted by- Team Chui Jhaal


#Problem Analysis:
-- Monolithic Architecture
	-All Functionality bundled into one server
	-Thus the whole system collapses when one service (e.g. Ticketing) crashes
– Orders dissapears ,cannot  reach to the kitchen ,quene discontinuation etc under  
   Peak load
– Lack of fault tolerance and resilience

#Planned Solution
– Microservice Architecture
	- Break the monolith into independent services 
		-Identity Provider
		-Order Gateway
		-Stock Service
		-Kitchen Quene
		-Notification Hub

– Authentication and Authorization using JWT Tokens
	-Ensures secure and protected routes, prevents unauthorized access during rush
–API Gateway and Cache management for Order
	-Overload cannot hit the database directly
	-Rejects impossible orders before accessing database which improves
            Responsiveness
– Kitchen Quene
	-Asynchronus Processing
	-Keeps System Responsive
–Real Time Updates (Notification)
–Monitoring
	-Services expose health metrics
	-Enables admins to monitor performance, detect failure
–CI/CD & Automated Validation
	-Automated piepline runs unit tests fo


#Tools and Frameworks used for Execution:

	Breaking into Microservices --Docker
	Authentication 		– Node.js + JWT
	Stock Services		– Mongo DB
	Asychronus Kitchen Quene  –RabbitMQ
	Notifications(Updates)        – WebSockets
	Partial Failure		– Iddempotency keys
	
FrontEnd			– HTML
				– CSS
				– Vanilla JS

#Used AI models:

	Breaking Problem– ChatGPT
	Code Generation - Claude
Antigravity
	To sum up everything - Microsoft Co Pilot
	Directions - Gemini
