import flask
from flask import request, jsonify

app = flask.Flask(__name__)

@app.route('/msg', methods=['POST','GET'])
def processMsg():
  #uuid will be passed here
  if(request.method == 'POST'):
    #send response back
    uuid = request.headers.get("uuid")
    print('Message:'+uuid)
    return 'I love you!!!',200
  else:
    #return old messages
    #jsonify sends back a response object
    uuid = request.args.get('uuid')
    print('History:'+uuid)
    return jsonify([{'sender':0, 'message':'Hello World!'},{'sender':1, 'message':'Hey World!'},{'sender':0, 'message':'How are you, World?'},{'sender':1, 'message':'Doing good, World!'},]);


@app.route('/acc', methods=['POST','DELETE'])
def processSession():
  if(request.method == 'POST'):
    #store uuid passed here in dict
    uuid = request.data.decode('utf-8')
    print('Add:'+uuid)
    return '',201
  else:
    #delete uuid from dict
    uuid = request.headers.get('uuid')
    print('Delete:'+uuid)
    return '',201

if __name__ == '__main__':
  app.run(port=5000, debug=True) #, debug=True